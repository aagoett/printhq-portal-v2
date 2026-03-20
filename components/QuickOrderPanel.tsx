'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Loader2, Plus, ShoppingCart, Trash2, UploadCloud, User, X } from 'lucide-react';

const MODE_COPY = {
  quote: {
    eyebrow: 'New Quote',
    helper: 'Use when specs are mostly known and you want to group multiple items under one intake.',
  },
  'quick-order': {
    eyebrow: 'Quick Order',
    helper: 'Fast path for repeat or clear work. Add multiple items, upload art, and push straight into production review.',
  },
  'internal-job': {
    eyebrow: 'Internal Job',
    helper: 'House work, samples, and tests without forcing a customer record.',
  },
} as const;

type QuickOrderProps = {
  supabase: any;
  currentUser: any;
  role: string;
  customers: any[];
  brandList: any[];
  stockLibrary: any[];
  workflowOptions: any[];
  onJobCreated?: () => void;
  mode?: 'quote' | 'quick-order' | 'internal-job';
};

type CartItem = {
  id: string;
  file: File;
  title: string;
  quantity: number;
  size: string;
  notes: string;
  paper_stock: string;
};

export default function QuickOrderPanel({
  supabase,
  currentUser,
  role,
  customers,
  brandList,
  stockLibrary,
  workflowOptions,
  onJobCreated,
  mode = 'quick-order',
}: QuickOrderProps) {
  const copy = MODE_COPY[mode];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobQty, setJobQty] = useState('');
  const [jobSize, setJobSize] = useState('');
  const [jobNotes, setJobNotes] = useState('');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [customStockValue, setCustomStockValue] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    if (brandList?.length && !selectedBrandId) {
      setSelectedBrandId(brandList[0].id);
    }
  }, [brandList, selectedBrandId]);

  useEffect(() => {
    if (!selectedCustomerId && currentUser) {
      setSelectedCustomerId(currentUser.id);
    }
  }, [currentUser, selectedCustomerId]);

  useEffect(() => {
    if (stockLibrary?.length && !selectedStockId) {
      setSelectedStockId(stockLibrary[0].name);
    }
  }, [stockLibrary, selectedStockId]);

  const triggerFilePicker = () => fileInputRef.current?.click();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setCurrentFile(file);
      if (!jobTitle) setJobTitle(file.name.split('.').slice(0, -1).join('.'));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setCurrentFile(file);
      if (!jobTitle) setJobTitle(file.name.split('.').slice(0, -1).join('.'));
    }
  };

  const resetForm = () => {
    setCurrentFile(null);
    setJobTitle('');
    setJobQty('');
    setJobSize('');
    setJobNotes('');
    if (stockLibrary.length > 0) setSelectedStockId(stockLibrary[0].name);
    setCustomStockValue('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddToCart = () => {
    if (!currentFile) return alert('Please upload a file.');
    if (!jobQty) return alert('Please enter quantity.');

    let finalStock = selectedStockId;
    if (selectedStockId === 'custom') {
      if (!customStockValue.trim()) return alert('Please enter custom paper details.');
      finalStock = customStockValue;
    }

    const newItem: CartItem = {
      id: Math.random().toString(36),
      file: currentFile,
      title: jobTitle || copy.eyebrow,
      quantity: parseInt(jobQty),
      size: jobSize || 'N/A',
      notes: jobNotes,
      paper_stock: finalStock,
    };

    setCart([...cart, newItem]);
    resetForm();
  };

  const handleRemoveFromCart = (id: string) => setCart(cart.filter((item) => item.id !== id));

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return alert('Cart is empty.');
    if (isNewCustomer && !newCustomerEmail.includes('@')) return alert('Invalid email.');

    setIsUploading(true);
    setStatusNote('');
    try {
      const isInternal = role === 'admin' || role === 'staff';
      let targetUserId = currentUser?.id;
      let targetEmail = currentUser?.email;

      if (isInternal) {
        if (isNewCustomer) {
          targetUserId = null;
          targetEmail = newCustomerEmail;
        } else if (selectedCustomerId) {
          targetUserId = selectedCustomerId;
          const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
          targetEmail = selectedCustomer?.email || '';
        }
      }

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: targetUserId,
          status: 'New',
          brand_id: selectedBrandId || null,
        })
        .select()
        .single();

      if (orderError || !newOrder) throw orderError;

      const jobTitleText = cart.length === 1 ? cart[0].title : `Order #${newOrder.id.substring(0, 6).toUpperCase()}`;
      const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);

      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          order_id: newOrder.id,
          user_id: targetUserId,
          guest_email: isNewCustomer ? targetEmail : null,
          title: jobTitleText,
          quantity: totalQty,
          status: 'Pending Review',
          created_by: currentUser?.id,
        })
        .select()
        .single();

      if (jobError || !newJob) throw jobError;

      for (const item of cart) {
        const { data: newItem, error: itemError } = await supabase
          .from('job_items')
          .insert({
            job_id: newJob.id,
            description: item.title,
            quantity: item.quantity,
            paper_stock: item.paper_stock,
            size: item.size,
            internal_notes: item.notes,
            status: 'Pending',
          })
          .select()
          .single();

        if (itemError || !newItem) throw itemError;

        const fileExt = item.file.name.split('.').pop();
        const fileName = `${newJob.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: fileData, error: uploadError } = await supabase.storage.from('uploads').upload(fileName, item.file);
        if (uploadError) console.error('File upload failed for ' + item.title, uploadError);

        if (fileData) {
          await supabase.from('job_assets').insert({
            job_id: newJob.id,
            job_item_id: newItem.id,
            uploader_id: currentUser?.id,
            file_url: fileData.path,
            file_name: item.file.name,
            asset_type: 'source',
            status: 'pending',
          });
        }

        const steps = (workflowOptions?.length ? workflowOptions.map((w: any) => w.name || w.step_name || w) : ['Prepress']) as string[];
        for (const stepName of steps) {
          await supabase.from('job_item_steps').insert({
            job_item_id: newItem.id,
            step_name: stepName,
            status: 'Pending',
            is_internal: true,
          });
        }
      }

      await supabase.from('job_logs').insert({
        job_id: newJob.id,
        user_id: currentUser?.id,
        action: 'Quick Order',
        details: `${cart.length} item(s) created from intake (${mode}).`,
      });

      setStatusNote(`Order created • ${cart.length} item(s)`);
      setCart([]);
      resetForm();
      onJobCreated?.();
    } catch (error: any) {
      console.error('Quick order failed', error?.message || error);
      setStatusNote('Failed to submit order.');
    } finally {
      setIsUploading(false);
    }
  };

  const totalQty = useMemo(() => cart.reduce((acc, item) => acc + (item.quantity || 0), 0), [cart]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase text-gray-500 flex items-center gap-2">{copy.eyebrow}</p>
          <h3 className="text-lg font-bold text-gray-900">Multi-item quick builder</h3>
          <p className="text-sm text-gray-500">{copy.helper}</p>
        </div>
        {statusNote && (
          <div className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">{statusNote}</div>
        )}
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {role !== 'customer' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold uppercase text-yellow-800 flex items-center">
                  <User size={14} className="mr-1" /> Customer
                </label>
                <button type="button" onClick={() => setIsNewCustomer(!isNewCustomer)} className="text-xs font-bold text-blue-600 hover:underline">
                  {isNewCustomer ? 'Select Existing' : '+ New Guest'}
                </button>
              </div>
              {isNewCustomer ? (
                <input type="email" placeholder="client@email.com" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} className="w-full rounded-lg border border-yellow-300 px-3 py-2 bg-white text-sm outline-none" />
              ) : (
                <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full rounded-lg border border-yellow-300 px-3 py-2 bg-white text-sm outline-none">
                  {[currentUser, ...customers.filter((c) => c.id !== currentUser?.id)].map((c) => (
                    <option key={c?.id} value={c?.id}>
                      {c?.email} {c?.role && c?.role !== 'customer' ? `(${c.role.toUpperCase()})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Company / Brand</label>
            <select value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm outline-none font-bold">
              {brandList.length > 0 ? brandList.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              )) : <option>No Brands Found</option>}
            </select>
          </div>
        </div>

        {cart.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 text-xs font-bold uppercase text-gray-500 flex justify-between">
              <span>Items in Order ({cart.length})</span>
              <span className="flex items-center gap-2">
                <span>Total</span>
                <span className="px-2 py-0.5 rounded-full bg-white text-gray-700 border border-gray-200 font-mono">{totalQty.toLocaleString()}</span>
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {cart.map((item) => (
                <div key={item.id} className="p-3 bg-white flex justify-between items-center">
                  <div className="flex items-center overflow-hidden">
                    <FileText size={16} className="text-blue-500 mr-3 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-400">{item.size} • {item.paper_stock}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono font-bold">{item.quantity}</span>
                    <button onClick={() => handleRemoveFromCart(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-6">
          <h4 className="font-bold text-gray-900 mb-4 flex items-center text-sm">
            <Plus size={16} className="mr-2 bg-black text-white rounded-full p-0.5" /> Add Item to Order
          </h4>

          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            {!currentFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFilePicker}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerFilePicker();
                  }
                }}
                role="button"
                tabIndex={0}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-black hover:bg-gray-50'}`}
              >
                <UploadCloud className={`mx-auto h-8 w-8 mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                <p className={`text-sm font-bold ${isDragging ? 'text-blue-700' : 'text-gray-600'}`}>
                  {isDragging ? 'Drop file here!' : 'Click or Drag artwork here'}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl text-blue-900 border border-blue-100">
                <div className="flex items-center overflow-hidden">
                  <FileText size={20} className="mr-3 text-blue-600 flex-shrink-0" />
                  <p className="text-sm font-medium truncate">{currentFile.name}</p>
                </div>
                <button type="button" onClick={() => setCurrentFile(null)} className="ml-2 text-blue-400 hover:text-red-500"><X size={16} /></button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <input type="text" placeholder="Item Title (e.g. Business Cards)" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
              </div>
              <div>
                <input type="number" placeholder="Qty" value={jobQty} onChange={(e) => setJobQty(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
              </div>
              <div className="col-span-2">
                <input type="text" placeholder="Size (e.g. 8.5x11)" value={jobSize} onChange={(e) => setJobSize(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black" />
              </div>
            </div>

            <div className="space-y-2">
              <select
                value={selectedStockId}
                onChange={(e) => setSelectedStockId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-black"
              >
                {stockLibrary.map((s: any) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
                <option value="custom">-- Custom / Other --</option>
              </select>
              {selectedStockId === 'custom' && (
                <input
                  type="text"
                  placeholder="Enter custom paper details..."
                  value={customStockValue}
                  onChange={(e) => setCustomStockValue(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm bg-blue-50 focus:bg-white transition-colors"
                />
              )}
            </div>

            <textarea
              value={jobNotes}
              onChange={(e) => setJobNotes(e.target.value)}
              placeholder="Internal notes"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            />

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!currentFile || !jobQty}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${!currentFile || !jobQty ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800 shadow-md'}`}
            >
              {!currentFile ? 'Select a File first...' : !jobQty ? 'Enter Quantity...' : '+ Add Item to List'}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSubmitOrder}
            disabled={isUploading || cart.length === 0}
            className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center shadow-lg"
          >
            {isUploading ? <Loader2 className="animate-spin mr-2" /> : <ShoppingCart className="mr-2" size={18} />} Submit Order ({cart.length} Items)
          </button>
        </div>
      </div>
    </div>
  );
}
