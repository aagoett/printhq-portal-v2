'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useMemo, useState } from 'react';
import InvoicePrintView from '@/components/InvoicePrintView';
import CustomerPortalShell from '@/components/CustomerPortalShell';

export default function InvoiceDetailsPage({ params }: { params: { id: string } }) {
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [role, setRole] = useState('customer');

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    const fetchInvoice = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setRole(profile?.role || 'customer');
      }

      const result = await supabase
        .from('invoices')
        .select(`
          *,
          company:brands!company_id(name,address,phone,email),
          order:orders(id, user_id, guest_email, shipping_address, user:profiles!user_id(first_name,last_name,company,address,phone))
        `)
        .eq('id', params.id)
        .single();

      setInvoiceData(result.data);
    };

    fetchInvoice();
  }, [params.id, supabase]);

  if (!invoiceData) return <div className="p-20 text-center text-gray-400">Invoice not found.</div>;

  const mappedInvoice = {
    invoiceNumber: invoiceData.invoice_number?.toString() || 'DRAFT',
    date: new Date(invoiceData.created_at).toLocaleDateString(),
    company: {
      name: invoiceData.company?.name || 'PACIFIC PRINTING',
      address: invoiceData.company?.address || '1445 Monterey Hwy\nSan Jose CA 95110',
      phone: invoiceData.company?.phone || '(408) 293-8083',
      email: invoiceData.company?.email
    },
    customer: {
      name: invoiceData.order?.user?.first_name ? `${invoiceData.order.user.first_name} ${invoiceData.order.user.last_name || ''}` : 'Guest / Cash Sale',
      company: invoiceData.order?.user?.company || 'Walk-in Customer',
      address: invoiceData.order?.user?.address || 'No address on file',
      phone: invoiceData.order?.user?.phone || '',
    },
    items: (invoiceData.items || []).map((item: any) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      totalPrice: Number(item.total_price),
      isTaxable: !!item.taxable,
      isPostage: !!item.is_postage,
    })),
    subtotal: Number(invoiceData.subtotal),
    shipping: Number(invoiceData.shipping),
    postage: Number(invoiceData.postage),
    tax: Number(invoiceData.tax),
    total: Number(invoiceData.total),
    paidAmount: Number(invoiceData.paid_amount),
    balance: Number(invoiceData.total) - Number(invoiceData.paid_amount),
    terms: invoiceData.terms,
    preparedBy: 'PrintHQ',
    salesRep: 'PrintHQ',
  };

  const isInternal = role === 'admin' || role === 'staff';

  if (!isInternal) {
    return (
      <CustomerPortalShell
        title={`Invoice #${mappedInvoice.invoiceNumber}`}
        description="Print-friendly billing detail with balance and line items."
        activeHref="/dashboard/invoices"
        backHref="/dashboard/invoices"
        backLabel="Back to invoices"
      >
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <InvoicePrintView invoice={mappedInvoice} />
        </div>
      </CustomerPortalShell>
    );
  }

  return <InvoicePrintView invoice={mappedInvoice} />;
}
