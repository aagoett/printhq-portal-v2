'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  Briefcase,
  MessageSquare,
  Settings,
  ArrowLeft,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: any;
  match?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home, match: ['/dashboard'] },
  { href: '/dashboard/jobs', label: 'Jobs', icon: FolderKanban, match: ['/dashboard/jobs', '/dashboard/jobs/'] },
  { href: '/dashboard/quotes', label: 'Quotes', icon: FileText, match: ['/dashboard/quotes', '/dashboard/quotes/'] },
  { href: '/dashboard/invoices', label: 'Invoices', icon: Briefcase, match: ['/dashboard/invoices', '/dashboard/invoices/'] },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, match: ['/dashboard/messages', '/dashboard/messages/'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, match: ['/dashboard/settings', '/dashboard/settings/'] },
];

type Props = {
  title: string;
  description?: string;
  activeHref?: string;
  backHref?: string;
  backLabel?: string;
  eyebrow?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export default function CustomerPortalShell({
  title,
  description,
  activeHref,
  backHref,
  backLabel = 'Back',
  eyebrow = 'Customer portal',
  meta,
  actions,
  children,
}: Props) {
  const pathname = usePathname();
  const resolvedActive = activeHref || pathname || '';
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeItem = useMemo(() => {
    return NAV_ITEMS.find((item) => {
      const paths = [item.href, ...(item.match || [])];
      return paths.some((path) => resolvedActive.startsWith(path));
    });
  }, [resolvedActive]);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside
          className={`${sidebarOpen ? 'w-72' : 'w-24'} hidden border-r border-gray-200 bg-white transition-all duration-200 lg:flex lg:flex-col`}
        >
          <div className="flex h-20 items-center justify-between border-b border-gray-100 px-6">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-xs font-black tracking-[0.24em] text-white">PHQ</span>
              {sidebarOpen ? (
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">PrintHQ</div>
                  <div className="truncate text-sm font-semibold text-gray-900">Customer Portal</div>
                </div>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen((value) => !value)}
              className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:text-black"
              aria-label={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
          </div>

          <div className="flex-1 px-4 py-6">
            <div className="mb-4 px-2 text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
              {sidebarOpen ? 'Navigate' : 'Nav'}
            </div>
            <nav className="space-y-1.5">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = activeItem?.href === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                      active ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                    } ${sidebarOpen ? 'justify-start' : 'justify-center px-0'}`}
                    title={!sidebarOpen ? label : undefined}
                  >
                    <Icon size={18} className={active ? 'text-white' : 'text-gray-400 group-hover:text-black'} />
                    {sidebarOpen ? <span>{label}</span> : null}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-gray-100 px-6 py-5">
            {sidebarOpen ? (
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Portal scope</div>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Track jobs, review proofs, confirm quotes, and keep billing tied to the work without exposing shop-only controls.
                </p>
              </div>
            ) : (
              <div className="flex justify-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-[11px] font-black uppercase text-gray-500">PHQ</span>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
            <div className="px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {backHref ? (
                      <Link
                        href={backHref}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-gray-300 hover:text-black"
                      >
                        <ArrowLeft size={16} /> {backLabel}
                      </Link>
                    ) : null}
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                      {eyebrow}
                    </span>
                    {meta ? <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">{meta}</div> : null}
                  </div>

                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
                    {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 sm:text-[15px]">{description}</p> : null}
                  </div>
                </div>

                {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
              </div>
            </div>
          </header>

          <main className="flex-1 bg-white/60 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
