'use client';

import { useState, useEffect } from 'react';
import { getInvoice } from '@/app/actions';
import InvoicePrintView from '@/components/InvoicePrintView';

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const fetchInvoice = async () => {
    const result = await getInvoice(params.id);
    if (result.success) {
      setInvoiceData(result.invoice);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-20 text-center font-bold text-gray-400 animate-pulse uppercase tracking-[0.2em]">Retrieving Invoice...</div>;
  if (error) return <div className="p-20 text-center text-red-500 font-bold underline">Error: {error}</div>;
  if (!invoiceData) return <div className="p-20 text-center text-gray-400">Invoice not found.</div>;

  // Map DB structure to Print Component Props
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
      address: 'SEE JOB SPECS', 
      acctNo: '2381', 
    },
    items: invoiceData.items.map((item: any) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      isTaxable: item.is_taxable
    })),
    subtotal: Number(invoiceData.subtotal),
    shipping: Number(invoiceData.shipping),
    postage: Number(invoiceData.postage),
    tax: Number(invoiceData.tax),
    total: Number(invoiceData.total),
    paidAmount: Number(invoiceData.paid_amount),
    balance: Number(invoiceData.total) - Number(invoiceData.paid_amount),
    terms: invoiceData.terms,
    preparedBy: 'PrintHQ System',
    salesRep: 'Web Portal',
  };

  return <InvoicePrintView invoice={mappedInvoice} />;
}
