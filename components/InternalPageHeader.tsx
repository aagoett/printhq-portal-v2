import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export type Crumb = { label: string; href?: string };

type InternalPageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  backHref?: string;
  backLabel?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  className?: string;
  maxWidthClassName?: string;
  sticky?: boolean;
};

export default function InternalPageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
  breadcrumbs = [],
  actions,
  className = "",
  maxWidthClassName = "max-w-7xl",
  sticky = false,
}: InternalPageHeaderProps) {
  const wrapperClasses = [
    "w-full bg-white border-b",
    sticky ? "sticky top-0 z-30" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClasses}>
      <div
        className={`${maxWidthClassName} mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4`}
      >
        <div className="space-y-2">
          {breadcrumbs.length > 0 ? (
            <nav className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
              <Link
                href="/dashboard"
                className="hover:text-black transition-colors"
              >
                Dashboard
              </Link>
              {breadcrumbs.map((crumb, idx) => (
                <div key={`${crumb.label}-${idx}`} className="flex items-center gap-2">
                  <span className="text-gray-300">/</span>
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-black transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </div>
              ))}
            </nav>
          ) : backHref ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black transition-colors"
            >
              {backLabel}
            </Link>
          ) : null}

          <div className="flex items-center gap-3">
            {Icon && (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <Icon size={18} />
              </span>
            )}
            <div>
              {eyebrow && (
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
                  {eyebrow}
                </p>
              )}
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {description && (
                <p className="text-sm text-gray-600 max-w-3xl">{description}</p>
              )}
            </div>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
