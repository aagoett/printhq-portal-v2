'use client';

import React from 'react';
import { Printer, Mail, Download, ArrowLeft } from 'lucide-react';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isTaxable: boolean;
  isPostage?: boolean;
}

interface InvoiceProps {
  invoice: {
    invoiceNumber: string;
    date: string;
    company: {
      name: string;
      logo?: string;
      address: string;
      phone: string;
      email?: string;
    };
    customer: {
      name: string;
      company?: string;
      address: string;
      phone?: string;
      acctNo?: string;
    };
    shipTo?: {
      name: string;
      company?: string;
      address: string;
    };
    items: InvoiceItem[];
    subtotal: number;
    shipping: number;
    postage: number;
    tax: number;
    total: number;
    paidAmount: number;
    balance: number;
    terms: string;
    preparedBy: string;
    salesRep: string;
    poNo?: string;
  };
}

export default function InvoicePrintView({ invoice }: InvoiceProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white min-h-screen text-black font-sans p-8 print:p-0">
      {/* TOOLBAR - Hide on print */}
      <div className="mb-8 flex justify-between items-center print:hidden border-b pb-4">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-black font-bold text-sm"
        >
          <ArrowLeft size={16}/> Back
        </button>
        <div className="flex gap-4">
          <button onClick={handlePrint} className="bg-black text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
            <Printer size={16}/> Print Invoice
          </button>
          <button className="bg-gray-100 text-gray-600 px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border">
            <Download size={16}/> PDF
          </button>
        </div>
      </div>

      {/* INVOICE CONTENT */}
      <div className="max-w-[8.5in] mx-auto bg-white border print:border-none p-[0.5in] shadow-xl print:shadow-none min-h-[10in] flex flex-col">
        
        {/* HEADER SECTION */}
        <div className="flex justify-between items-start mb-10">
          <div className="w-1/2">
            {/* LOGO Placeholder */}
            <div className="mb-4">
              <h1 className="text-4xl font-black italic tracking-tighter text-blue-800 flex flex-col">
                <span className="text-red-600 leading-tight">{invoice.company.name.split(' ')[0]}</span>
                <span className="text-gray-900 -mt-2 uppercase text-lg tracking-[0.2em] font-bold">{invoice.company.name.split(' ').slice(1).join(' ')}</span>
              </h1>
            </div>
            <div className="text-xs text-gray-600 leading-relaxed font-medium">
              {invoice.company.address.split('\n').map((line, i) => <p key={i}>{line}</p>)}
              <p>Phone: {invoice.company.phone}</p>
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <h2 className="text-3xl font-black text-gray-900 mb-1">Invoice {invoice.invoiceNumber}</h2>
            <p className="text-sm font-bold text-gray-500 tracking-wider">Date: {invoice.date}</p>
            
            <div className="mt-8 flex text-left gap-12">
              <div className="w-48">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-2 border-b">Bill To:</p>
                <div className="text-xs font-bold text-gray-900 leading-normal">
                  <p>{invoice.customer.name}</p>
                  {invoice.customer.company && <p>{invoice.customer.company}</p>}
                  <p className="whitespace-pre-line">{invoice.customer.address}</p>
                </div>
              </div>
              <div className="w-48">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-2 border-b">Ship To:</p>
                <div className="text-xs font-bold text-gray-900 leading-normal">
                  <p>{invoice.shipTo?.name || invoice.customer.name}</p>
                  <p>{invoice.shipTo?.company || invoice.customer.company}</p>
                  <p className="whitespace-pre-line">{invoice.shipTo?.address || invoice.customer.address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* METADATA BAR */}
        <div className="bg-emerald-600 text-white rounded-t-sm grid grid-cols-6 text-[10px] font-black uppercase tracking-widest divide-x divide-emerald-500 border border-emerald-600">
            <div className="px-3 py-1.5 text-center">Acct.No</div>
            <div className="px-3 py-1.5 text-center">Ordered By</div>
            <div className="px-3 py-1.5 text-center">Phone</div>
            <div className="px-3 py-1.5 text-center">Fax / P.O. No</div>
            <div className="px-3 py-1.5 text-center">Prepared By</div>
            <div className="px-3 py-1.5 text-center">Sales Rep</div>
        </div>
        <div className="grid grid-cols-6 text-xs border-l border-r border-b divide-x mb-8">
            <div className="px-3 py-2 text-center font-bold">{invoice.customer.acctNo || '--'}</div>
            <div className="px-3 py-2 text-center font-bold">{invoice.customer.name}</div>
            <div className="px-3 py-2 text-center font-bold">{invoice.customer.phone || '--'}</div>
            <div className="px-3 py-2 text-center font-bold">{invoice.poNo || '--'}</div>
            <div className="px-3 py-2 text-center font-bold">{invoice.preparedBy}</div>
            <div className="px-3 py-2 text-center font-bold">{invoice.salesRep}</div>
        </div>

        {/* ITEMS TABLE */}
        <div className="flex-1">
          <table className="w-full border-collapse">
            <thead className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-4 py-1.5 border border-emerald-600 text-center w-24">Quantity</th>
                <th className="px-4 py-1.5 border border-emerald-600 text-left">Description</th>
                <th className="px-4 py-1.5 border border-emerald-600 text-right w-32">Unit Price</th>
                <th className="px-4 py-1.5 border border-emerald-600 text-right w-32">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y border-x divide-gray-100">
              {invoice.items.map((item, i) => (
                <tr key={i} className="min-h-[60px] align-top">
                  <td className="px-4 py-4 text-sm font-black text-center">{item.quantity.toLocaleString()}</td>
                  <td className="px-4 py-4 text-xs">
                    <div className="font-black text-gray-900 mb-1">{item.description}</div>
                    {/* Additional details could go here */}
                  </td>
                  <td className="px-4 py-4 text-xs text-right font-medium">
                    {item.isPostage ? 'POSTAGE' : `$${item.unitPrice.toFixed(4)}/Ea`}
                  </td>
                  <td className="px-4 py-4 text-sm font-black text-right">${item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
              {/* Spacer rows */}
              {Array.from({ length: Math.max(0, 8 - invoice.items.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-12">
                   <td className="px-4 border-x-0"></td>
                   <td className="px-4"></td>
                   <td className="px-4"></td>
                   <td className="px-4 border-x-0"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER TOTALS */}
        <div className="mt-auto">
            <div className="bg-emerald-600 text-white rounded-t-sm grid grid-cols-7 text-[9px] font-black uppercase tracking-widest divide-x divide-emerald-500 border border-emerald-600">
                <div className="px-2 py-1.5 text-center">Terms</div>
                <div className="px-2 py-1.5 text-center">Subtotal</div>
                <div className="px-2 py-1.5 text-center">Shipping</div>
                <div className="px-2 py-1.5 text-center">Tax</div>
                <div className="px-2 py-1.5 text-center">Total</div>
                <div className="px-2 py-1.5 text-center">Paid</div>
                <div className="px-2 py-1.5 text-center">Balance</div>
            </div>
            <div className="grid grid-cols-7 text-xs border-l border-r border-b divide-x bg-gray-50/50">
                <div className="px-2 py-3 text-center font-bold flex items-center justify-center">{invoice.terms}</div>
                <div className="px-2 py-3 text-center font-black flex items-center justify-center">${invoice.subtotal.toFixed(2)}</div>
                <div className="px-2 py-3 text-center font-black flex items-center justify-center">${invoice.shipping.toFixed(2)}</div>
                <div className="px-2 py-3 text-center font-black flex items-center justify-center">${invoice.tax.toFixed(2)}</div>
                <div className="px-2 py-3 text-center font-black bg-emerald-50 flex items-center justify-center text-sm">${invoice.total.toFixed(2)}</div>
                <div className="px-2 py-3 text-center font-black flex items-center justify-center text-red-600">-${invoice.paidAmount.toFixed(2)}</div>
                <div className="px-2 py-3 text-center font-black bg-emerald-100 flex items-center justify-center text-sm">${invoice.balance.toFixed(2)}</div>
            </div>
            
            <div className="mt-6 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-900 underline decoration-2 underline-offset-4">Pay from this invoice</p>
                <div className="mt-4 flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase">
                    <p>{invoice.company.name} • {invoice.company.address.replace(/\n/g, ' • ')} • {invoice.company.phone}</p>
                    <p>(pn# {invoice.invoiceNumber})</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
