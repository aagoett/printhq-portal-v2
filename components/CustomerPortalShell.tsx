'use client';

import Link from 'next/link';
import { Home, FileText, Briefcase, MessageSquare, Settings, ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/quotes', label: 'Quotes', icon: FileText },
  { href: '/dashboard/invoices', label: 'Invoices', icon: Briefcase },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

type Props = {
  title: string;
  description?: string;
  activeHref?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function CustomerPortalShell({
  title,
  description,
  activeHref,
  backHref,
  backLabel = 'Back',
  actions,
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {backHref ? (
                  <Link href={backHref} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-black">
                    <ArrowLeft size={16} /> {backLabel}
                  </Link>
                ) : null}
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-gray-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs text-white">PHQ</span>
                  PrintHQ Customer Portal
                </Link>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {description ? <p className="text-sm text-gray-600">{description}</p> : null}
              </div>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
          <nav className="flex flex-wrap gap-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = activeHref === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-black'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
