import { CloseIcon } from './navIcons';

type SidebarBrandHeaderProps = {
  companyName: string;
  companyLogo?: string | null;
  collapsed?: boolean;
  onClose?: () => void;
};

function BrandLogo({
  companyLogo,
  companyInitial,
  className = 'w-8 h-8',
}: {
  companyLogo?: string | null;
  companyInitial: string;
  className?: string;
}) {
  if (companyLogo) {
    return (
      <img
        src={companyLogo}
        alt=""
        className={`${className} rounded-md object-contain sidebar-logo-bg p-0.5 shrink-0 ring-1 ring-white/20`}
      />
    );
  }
  return (
    <div
      className={`${className} rounded-md sidebar-logo-bg flex items-center justify-center font-bold text-[11px] shrink-0 select-none ring-1 ring-white/20`}
      aria-hidden
    >
      {companyInitial}
    </div>
  );
}

function stripLegalSuffix(name: string): string {
  return name
    .replace(/\s*\(India\)\s*/gi, ' ')
    .replace(/\s*(Pvt\.?\s*Ltd\.?|Private\s+Limited|Ltd\.?)\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function SidebarBrandHeader({
  companyName,
  companyLogo,
  collapsed = false,
  onClose,
}: SidebarBrandHeaderProps) {
  const companyInitial = companyName.charAt(0).toUpperCase();
  const displayName = stripLegalSuffix(companyName);

  return (
    <div className={`sidebar-brand border-b sidebar-divider flex items-center gap-2 shrink-0 overflow-hidden ${collapsed ? 'lg:justify-center lg:!px-0' : ''}`}>
      <div className={`flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden ${collapsed ? 'lg:hidden' : ''}`}>
        <BrandLogo companyLogo={companyLogo} companyInitial={companyInitial} />
        <h1 className="sidebar-brand-name flex-1 min-w-0 font-semibold" title={companyName}>
          {displayName}
        </h1>
      </div>

      {collapsed && (
        <div className="hidden lg:flex min-w-0">
          <BrandLogo companyLogo={companyLogo} companyInitial={companyInitial} />
        </div>
      )}

      {onClose && (
        <button
          type="button"
          className="sidebar-icon-btn lg:hidden min-h-11 min-w-11 rounded-md flex items-center justify-center shrink-0"
          aria-label="Close menu"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}
