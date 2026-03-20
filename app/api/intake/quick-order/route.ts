import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/admin';

export type QuickOrderItemPayload = {
  title: string;
  quantity: number;
  size: string;
  size_label?: string;
  notes: string;
  paper_stock: string;
  product_key?: string;
  product_name?: string;
  page_count?: number;
  cover_stock?: string;
  inside_stock?: string;
  fold?: string;
  coating?: string;
  mailing?: boolean;
  mailing_notes?: string;
  substrate?: string;
  finishing?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // 1) Ensure user + role
    const { data: userResp } = await supabase.auth.getUser();
    const authedUser = userResp?.user;
    if (!authedUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', authedUser.id)
      .single();

    if (!profile || !['admin', 'staff'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2) Parse form data
    const formData = await req.formData();
    const itemsRaw = formData.get('items');
    if (!itemsRaw) return NextResponse.json({ error: 'Missing items' }, { status: 400 });

    const items = JSON.parse(itemsRaw as string) as QuickOrderItemPayload[];

    const files = formData.getAll('files') as File[];
    if (files.length !== items.length) {
      return NextResponse.json({ error: 'Files/items length mismatch' }, { status: 400 });
    }

    const selectedBrandId = (formData.get('selectedBrandId') as string) || null;
    const isNewCustomer = (formData.get('isNewCustomer') as string) === 'true';
    const newCustomerEmail = (formData.get('newCustomerEmail') as string) || null;
    const selectedCustomerId = (formData.get('selectedCustomerId') as string) || null;
    const workflowOptions = JSON.parse((formData.get('workflowOptions') as string) || '[]') as Array<any>;
    const mode = (formData.get('mode') as string) || 'quick-order';

    // 3) Determine target user
    const targetUserId = isNewCustomer ? null : (selectedCustomerId || authedUser.id);
    const guestEmail = isNewCustomer ? newCustomerEmail : null;

    // 4) Use service role for all writes
    const admin = createServiceRoleClient();

    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: targetUserId,
        status: 'New',
        brand_id: selectedBrandId,
      })
      .select()
      .single();

    if (orderError || !order) throw orderError;

    const totalQty = items.reduce((acc, item) => acc + (item.quantity || 0), 0);
    const primaryItemTitle = items[0]?.title || items[0]?.product_name || 'Quick Order';
    const jobTitle = items.length === 1 ? primaryItemTitle : `Order #${order.id.substring(0, 6).toUpperCase()}`;

    const { data: job, error: jobError } = await admin
      .from('jobs')
      .insert({
        order_id: order.id,
        user_id: targetUserId,
        guest_email: guestEmail,
        title: jobTitle,
        quantity: totalQty,
        status: 'Pending Review',
        created_by: authedUser.id,
      })
      .select()
      .single();

    if (jobError || !job) throw jobError;

    const createdItems: any[] = [];
    const workflowSteps = (workflowOptions?.length ? workflowOptions.map((w: any) => w.name || w.step_name || w) : ['Prepress']) as string[];

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const file = files[idx];

      const paperStockValue = item.cover_stock && item.inside_stock
        ? `Cover: ${item.cover_stock} / Inside: ${item.inside_stock}`
        : item.paper_stock;

      const specParts = [
        item.product_name || item.product_key ? `Product: ${item.product_name || item.product_key}` : null,
        item.size ? `Size: ${item.size}` : null,
        item.page_count ? `Pages: ${item.page_count}` : null,
        item.cover_stock ? `Cover: ${item.cover_stock}` : null,
        item.inside_stock ? `Inside: ${item.inside_stock}` : null,
        item.fold ? `Fold: ${item.fold}` : null,
        item.coating ? `Coating: ${item.coating}` : null,
        item.substrate ? `Substrate: ${item.substrate}` : null,
        item.finishing?.length ? `Finishing: ${item.finishing.join(', ')}` : null,
        item.mailing ? `Mailing: Yes${item.mailing_notes ? ` (${item.mailing_notes})` : ''}` : null,
      ].filter(Boolean).join(' • ');

      const combinedNotes = [specParts, item.notes].filter(Boolean).join('\n');

      const { data: newItem, error: itemError } = await admin
        .from('job_items')
        .insert({
          job_id: job.id,
          description: item.title || item.product_name || 'Quick Order Item',
          quantity: item.quantity,
          paper_stock: paperStockValue,
          size: item.size,
          internal_notes: combinedNotes,
          status: 'Pending',
        })
        .select()
        .single();

      if (itemError || !newItem) throw itemError;
      createdItems.push(newItem);

      // Upload artwork to storage bucket
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${job.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: fileData, error: uploadError } = await admin.storage.from('uploads').upload(fileName, file);
        if (uploadError) throw uploadError;

        await admin.from('job_assets').insert({
          job_id: job.id,
          job_item_id: newItem.id,
          uploader_id: authedUser.id,
          file_url: fileData.path,
          file_name: file.name,
          asset_type: 'source',
          status: 'pending',
        });
      }

      for (const stepName of workflowSteps) {
        await admin.from('job_item_steps').insert({
          job_item_id: newItem.id,
          step_name: stepName,
          status: 'Pending',
          is_internal: true,
        });
      }
    }

    await admin.from('job_logs').insert({
      job_id: job.id,
      user_id: authedUser.id,
      action: mode === 'internal-job' ? 'Internal Job' : 'Quick Order',
      details: `${items.length} item(s) created from intake (${mode}).`,
    });

    return NextResponse.json({ success: true, orderId: order.id, jobId: job.id });
  } catch (error: any) {
    console.error('Quick order API failed', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
