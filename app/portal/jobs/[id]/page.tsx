'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Download, FileImage, FileText, Clock, Printer, Mail, MessageSquare, Send, AlertTriangle, Palette, UploadCloud } from 'lucide-react';
import { normalizePortalVisibility } from '@/lib/customerJobs';

export default function PublicJobProofPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [customerUploads, setCustomerUploads] = useState<any[]>([]);
  const [viewingAssetId, setViewingAssetId] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('unknown');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [requestChangesNote, setRequestChangesNote] = useState('');
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [artFile, setArtFile] = useState<File | null>(null);
  const [artUploading, setArtUploading] = useState(false);
  const [artUploadSuccess, setArtUploadSuccess] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const recordAudit = async (action: string, details: string) => {
    await supabase.from('job_logs').insert({ job_id: params.id, action, details, user_id: null });
  };

  useEffect(() => {
    fetchJobData();

    const channel = supabase.channel('portal_messages')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `job_id=eq.${params.id}`
      }, () => refreshMessages())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchJobData = async () => {
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*, orders(brands(name))')
      .eq('id', params.id)
      .single();

    if (!jobData) { setLoading(false); return; }

    const portalState = normalizePortalVisibility(jobData.portal_visibility);
    if (portalState === 'internal' || portalState === 'hidden') {
      setLoading(false);
      setJob(null);
      return;
    }

    setJob(jobData);

    const { data: itemsData } = await supabase
      .from('job_items')
      .select('*, job_item_steps(*)')
      .eq('job_id', params.id);

    if (itemsData) {
      setItems(itemsData);
      const visibleSteps = itemsData.flatMap(item =>
        (item.job_item_steps || []).filter((s: any) => s.is_internal === false)
      );
      setSteps(visibleSteps);
    }

    const { data: assetData } = await supabase
      .from('job_assets')
      .select('*')
      .eq('job_id', params.id)
      .eq('portal_visible', true)
      .in('asset_type', ['proof'])
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    if (assetData && assetData.length > 0) {
      setAssets(assetData);
      loadPreview(assetData[0]);
    } else {
      setAssets([]);
      setPreviewUrl(null);
    }

    const { data: uploadData } = await supabase
      .from('job_assets')
      .select('*')
      .eq('job_id', params.id)
      .eq('uploaded_by_customer', true)
      .order('created_at', { ascending: false });
    if (uploadData) setCustomerUploads(uploadData);

    await refreshMessages();
    setLoading(false);
  };

  const refreshMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(first_name, role)')
      .eq('job_id', params.id)
      .eq('is_customer_visible', true)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const loadPreview = async (asset: any) => {
    setViewingAssetId(asset.id);
    const { data } = await supabase.storage.from('uploads').createSignedUrl(asset.file_url, 3600);
    if (data?.signedUrl) {
      setPreviewUrl(data.signedUrl);
      const lower = asset.file_url.toLowerCase();
      if (lower.match(/\.(jpg|jpeg|png|webp)$/)) setPreviewType('image');
      else if (lower.endsWith('.pdf')) setPreviewType('pdf');
      else setPreviewType('other');
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this proof for printing? This cannot be undone.')) return;
    setActionLoading(true);
    await supabase.from('job_assets').update({ status: 'approved' })
      .eq('job_id', params.id).eq('asset_type', 'proof').eq('status', 'pending');
    await supabase.from('jobs').update({ status: 'In Production', customer_action_required: false, customer_action_type: null, customer_action_note: null }).eq('id', params.id);
    await supabase.from('messages').insert({
      job_id: params.id,
      content: `${senderName || 'Customer'} approved the proof and released to production`,
      is_customer_visible: true,
    });
    await recordAudit('Proof approved (customer)', 'Customer approved proof from portal');
    setJob((j: any) => ({ ...j, status: 'In Production', customer_action_required: false, customer_action_type: null, customer_action_note: null }));
    setSuccessMsg('✅ Proof approved! Your job has been sent to production. We will be in touch with shipping details.');
    setActionLoading(false);
  };

  const handleRequestChanges = async () => {
    const note = requestChangesNote.trim();
    if (!note) return;
    setActionLoading(true);
    await supabase.from('jobs').update({ status: 'Changes Requested', notes: note, customer_action_required: false }).eq('id', params.id);
    await supabase.from('messages').insert({
      job_id: params.id,
      content: `[Changes Requested] ${note}`,
      is_customer_visible: true,
    });
    await recordAudit('Customer change request', note);
    setSuccessMsg('✏️ Change request submitted! Our team will revise the artwork and share the next proof here.');
    setJob((j: any) => ({ ...j, status: 'Changes Requested', notes: note, customer_action_required: false }));
    setRequestChangesNote('');
    setShowChangeForm(false);
    setActionLoading(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setSendingMsg(true);
    await supabase.from('messages').insert({
      job_id: params.id,
      content: senderName ? `${senderName}: ${newMessage}` : newMessage,
      is_customer_visible: true,
    });
    setNewMessage('');
    setSendingMsg(false);
  };

  const handleArtworkUpload = async () => {
    if (!artFile) return;
    setArtUploading(true);
    setArtUploadSuccess('');
    const safeName = artFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageName = `${params.id}-customer-${Date.now()}-${safeName}`;
    const { data: uploadData, error } = await supabase.storage.from('uploads').upload(storageName, artFile);
    if (error) {
      alert(`Upload failed: ${error.message}`);
      setArtUploading(false);
      return;
    }

    await supabase.from('job_assets').insert({
      job_id: params.id,
      uploader_id: null,
      file_url: uploadData?.path,
      file_name: artFile.name,
      asset_type: 'source',
      status: 'pending',
      portal_visible: false,
      uploaded_by_customer: true,
    });

    await supabase.from('jobs').update({
      customer_action_required: false,
      customer_action_type: null,
      customer_action_note: null,
      portal_visibility: normalizePortalVisibility(job.portal_visibility) === 'internal' ? 'shell' : job.portal_visibility,
    }).eq('id', params.id);

    await supabase.from('messages').insert({
      job_id: params.id,
      content: `${senderName || 'Customer'} uploaded artwork: ${artFile.name}`,
      is_customer_visible: true,
    });

    await recordAudit('Customer upload', `${artFile.name} uploaded from portal`);

    setArtUploadSuccess(`${artFile.name} uploaded. Thank you!`);
    setArtFile(null);
    setArtUploading(false);
    await fetchJobData();
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <Clock className="animate-spin" size={32} />
        <p className="font-medium">Loading your proof...</p>
      </div>
    </div>
  );

  if (!job) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="text-red-500" size={28} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Job Not Available</h1>
        <p className="text-gray-500">This job is not shared to the portal yet or the link is incorrect.</p>
      </div>
    </div>
  );

  const brandName = job.orders?.brands?.name || 'PrintHQ';
  const isApproved = job.status === 'In Production' || job.status === 'Shipped' || job.status === 'Complete';
  const isChangesRequested = job.status === 'Changes Requested';
  const pendingProof = assets.find(a => a.status === 'pending');
  const awaitingArtworkItems = items.filter((item: any) => item.waitingOnArt || item.artwork_status === 'Waiting on Art' || item.artworkStatus === 'Waiting on Art');
  const needsCustomerArtwork = job.customer_action_type === 'upload_artwork' && (job.customer_action_required || awaitingArtworkItems.length > 0);
  const impliedProofAction = pendingProof && (!job.customer_action_required && !job.customer_action_type);
  const customerActionType = job.customer_action_type || (impliedProofAction ? 'approve_proof' : null);
  const customerActionRequired = job.customer_action_required || impliedProofAction || needsCustomerArtwork;
  const customerActionNote = job.customer_action_note;

  const customerAction = (() => {
    if (!customerActionType || !customerActionRequired) return { required: false };
    if (customerActionType === 'upload_artwork') {
      return {
        required: true,
        label: 'Artwork required',
        description: customerActionNote || 'Upload final artwork or copy so we can produce your proof.',
        tone: 'orange'
      };
    }
    if (customerActionType === 'approve_proof') {
      return {
        required: true,
        label: 'Review & approve proof',
        description: customerActionNote || 'Please review the live proof and either approve for print or request changes.',
        tone: 'blue'
      };
    }
    return {
      required: true,
      label: 'Action required',
      description: customerActionNote || 'Please reply with the requested info so we can keep moving.',
      tone: 'yellow'
    };
  })();

  const actionRequiredLabel = customerAction.required ? customerAction.label : isChangesRequested ? 'PrintHQ is revising your proof' : 'No action required right now';
  const portalState = isApproved
    ? {
        label: 'Approved and in production',
        description: 'Your approval is locked in. You can still review the approved proof and follow job updates here.',
        className: 'bg-green-50 border-green-200 text-green-800',
      }
    : customerAction.required && customerAction.tone === 'orange'
      ? {
          label: 'Customer action required',
          description: customerAction.description,
          className: 'bg-orange-50 border-orange-200 text-orange-800',
        }
      : isChangesRequested
        ? {
            label: 'Revision requested',
            description: 'We received your feedback. The next proof will appear here when it is ready.',
            className: 'bg-amber-50 border-amber-200 text-amber-800',
          }
        : pendingProof
          ? {
              label: 'Customer action required',
              description: 'A proof is live now. Review it carefully, then approve for print or request changes from this page.',
              className: 'bg-blue-50 border-blue-200 text-blue-800',
            }
          : {
              label: 'Portal shell ready',
              description: 'Your job is in our system. Files, proofs, and updates will appear here as soon as they are ready to share.',
              className: 'bg-gray-50 border-gray-200 text-gray-700',
            };

  return (
    <div className="min-h-screen bg-gray-100">

      <div className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{brandName}</h1>
            <p className="text-xs text-gray-400 mt-0.5">Proof Review Portal</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase font-bold">Job ID</p>
            <p className="font-mono font-bold text-sm">#{params.id.substring(0, 8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-600 text-white text-center px-4 py-3 font-medium text-sm">
          {successMsg}
        </div>
      )}
      {isChangesRequested && !successMsg && (
        <div className="bg-amber-500 text-white text-center px-4 py-3 font-medium text-sm">
          Changes requested — our team is reviewing your feedback.
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {customerAction.required && (
          <div className={`rounded-2xl border px-5 py-4 shadow-sm ${customerAction.tone === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                {customerAction.tone === 'orange' ? <Palette className="mt-0.5" size={18} /> : <AlertTriangle className="mt-0.5" size={18} />}                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">Customer action required</p>
                  <p className="mt-1 text-sm font-semibold">{customerAction.label}</p>
                  <p className="mt-1 text-sm opacity-80">{customerAction.description}</p>
                </div>
              </div>
              <span className="self-start rounded-full border border-current/20 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]">
                {actionRequiredLabel}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Customer job shell</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">{job.title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium">{job.quantity?.toLocaleString()} units</span>
                {job.size && <> &bull; {job.size}</>}
                {job.paper_stock && <> &bull; {job.paper_stock}</>}
              </p>
            </div>
            <span className={`self-start px-3 py-1.5 rounded-full text-xs font-bold uppercase ${
              isApproved ? 'bg-green-100 text-green-700' :
              isChangesRequested ? 'bg-amber-100 text-amber-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {job.status}
            </span>
          </div>

          <div className={`rounded-xl border px-4 py-3 ${portalState.className}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]">{portalState.label}</p>
                <p className="mt-1 text-sm">{portalState.description}</p>
              </div>
              <span className="self-start rounded-full border border-current/20 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                Next up: {actionRequiredLabel}
              </span>
            </div>
          </div>
        </div>

        {needsCustomerArtwork && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-orange-800">
              <Palette size={18} />
              <h3 className="text-sm font-bold uppercase tracking-[0.18em]">Artwork still needed</h3>
            </div>
            <p className="text-sm text-gray-600">Upload final files here so we can continue without breaking this job thread.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {awaitingArtworkItems.map((item: any) => (
                <span key={item.id} className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800">
                  {item.description || 'Untitled item'}
                </span>
              ))}
            </div>
            <div className={`mt-4 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer ${artFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-black hover:bg-gray-50'}`} onClick={() => document.getElementById('art-upload')?.click()}>
              <input id="art-upload" type="file" className="hidden" onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setArtFile(e.target.files[0]);
                  setArtUploadSuccess('');
                }
              }} />
              <UploadCloud className={`mx-auto h-10 w-10 mb-2 ${artFile ? 'text-green-600' : 'text-gray-400'}`} />
              {artFile ? (
                <p className="font-bold text-green-700 text-sm truncate">{artFile.name}</p>
              ) : (
                <p className="text-sm font-bold text-gray-600">Click to select artwork or packaged files</p>
              )}
              <p className="mt-1 text-xs text-gray-500">PDF, AI, EPS, TIFF, or packaged ZIP files are fine.</p>
            </div>
            <button
              onClick={handleArtworkUpload}
              disabled={!artFile || artUploading}
              className={`w-full py-3 rounded-xl font-bold text-white transition-all ${!artFile || artUploading ? 'bg-gray-300' : 'bg-black hover:bg-gray-800'}`}
            >
              {artUploading ? 'Uploading...' : 'Upload & Notify PrintHQ'}
            </button>
            {artUploadSuccess && <p className="text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle size={16}/> {artUploadSuccess}</p>}
            {customerUploads.length > 0 && (
              <div className="pt-2 border-t border-orange-100">
                <p className="text-xs font-bold uppercase text-gray-500 mb-2">Your recent uploads</p>
                <div className="space-y-2">
                  {customerUploads.map((upload) => (
                    <div key={upload.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText size={14} className="text-gray-400" />
                        <span className="truncate">{upload.file_name}</span>
                      </div>
                      <span className="text-[11px] text-gray-400">{new Date(upload.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {steps.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-4">Production Progress</h3>
            <div className="flex flex-wrap gap-2">
              {steps.map((step: any) => (
                <div key={step.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  step.status === 'Completed'
                    ? 'bg-green-50 border-green-300 text-green-800'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                  {step.status === 'Completed' && <CheckCircle size={12} />}
                  {step.step_name}
                </div>
              ))}
            </div>
          </div>
        )}

        {assets.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileImage size={18} className="text-purple-500" />
                Your Proof
              </h3>
              {previewUrl && (
                <a href={previewUrl} target="_blank"
                   className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-black border border-gray-200 px-3 py-1.5 rounded-lg bg-white">
                  <Download size={14} /> Download
                </a>
              )}
            </div>

            {assets.length > 1 && (
              <div className="px-6 py-3 border-b border-gray-100 flex gap-2 overflow-x-auto">
                {assets.map((asset, i) => (
                  <button key={asset.id} onClick={() => loadPreview(asset)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded text-xs font-bold border transition-all ${
                      viewingAssetId === asset.id ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500 hover:border-black'
                    }`}>
                    Version {assets.length - i}
                    {asset.status === 'approved' && ' ✓'}
                  </button>
                ))}
              </div>
            )}

            <div className="bg-gray-100 flex items-center justify-center p-6 min-h-[400px]">
              {!previewUrl ? (
                <p className="text-gray-400">Loading preview...</p>
              ) : previewType === 'image' ? (
                <img src={previewUrl} className="max-w-full max-h-[70vh] shadow-lg rounded" alt="Proof preview" />
              ) : (
                <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-[70vh] shadow-lg rounded bg-white" />
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <Clock className="mx-auto text-gray-300 mb-3" size={40} />
            <h3 className="text-lg font-semibold text-gray-700">Portal Ready — No Proof Shared Yet</h3>
            <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
              Your job shell is live, but no proof has been shared yet. We&apos;re still preparing the customer-visible files and will notify you when review is ready.
            </p>
          </div>
        )}

        {pendingProof && !isApproved && !isChangesRequested && !successMsg && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Ready to proceed?</h3>
              <p className="text-sm text-gray-500">
                Check spelling, layout, quantity, and any variable data. If anything is off, leave one clean revision request here so the next proof stays attached to this order.
              </p>
            </div>

            {showChangeForm ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-amber-800">What needs to change?</label>
                <textarea
                  value={requestChangesNote}
                  onChange={(e) => setRequestChangesNote(e.target.value)}
                  placeholder="Example: Update John’s phone number to 925-555-1212, tighten the logo margin on the back, and use the revised postcard copy from my last email."
                  className="min-h-[120px] w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-amber-400 focus:outline-none"
                />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleRequestChanges}
                    disabled={actionLoading || !requestChangesNote.trim()}
                    className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 disabled:opacity-40"
                  >
                    Send Change Request
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowChangeForm(false); setRequestChangesNote(''); }}
                    className="flex-1 py-3 rounded-xl border border-gray-200 bg-white font-bold text-gray-700 hover:border-black"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowChangeForm(true)}
                disabled={actionLoading}
                className="flex-1 py-4 border-2 border-amber-200 text-amber-700 rounded-xl font-bold hover:bg-amber-50 transition-colors flex justify-center items-center gap-2 text-sm"
              >
                <XCircle size={18} /> Request Changes
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg transition-all flex justify-center items-center gap-2 text-sm"
              >
                <CheckCircle size={18} /> Approve for Printing
              </button>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="bg-green-50 border-2 border-green-500 border-dashed rounded-xl p-8 flex flex-col items-center text-center">
            <CheckCircle size={36} className="text-green-600 mb-3" />
            <h3 className="text-lg font-bold text-green-800">Approved &amp; In Production</h3>
            <p className="text-sm text-green-700 mt-1">Your job is confirmed. We&apos;ll be in touch with shipping info.</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4 bg-gray-50 flex items-center gap-2">
            <MessageSquare size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-900">Questions or Comments</h3>
          </div>

          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">No messages yet. Ask us anything!</p>
            )}
            {messages.map((msg: any) => {
              const isStaff = msg.profiles?.role === 'admin' || msg.profiles?.role === 'staff';
              return (
                <div key={msg.id} className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                    isStaff ? 'bg-gray-100 text-gray-800' : 'bg-black text-white'
                  }`}>
                    {isStaff && msg.profiles?.first_name && (
                      <p className="text-[10px] font-bold opacity-60 mb-0.5 uppercase">{msg.profiles.first_name}</p>
                    )}
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-100 p-4 space-y-2">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-black"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMsg}
                className="bg-black text-white px-4 rounded-lg hover:bg-gray-800 disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 pb-8">
          <div className="flex justify-center gap-6 mt-2">
            <button onClick={() => window.print()} className="hover:text-black flex items-center gap-1">
              <Printer size={12} /> Print
            </button>
            <a href={`mailto:?subject=Proof Review - ${job.title}`}
               className="hover:text-black flex items-center gap-1">
              <Mail size={12} /> Email
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
