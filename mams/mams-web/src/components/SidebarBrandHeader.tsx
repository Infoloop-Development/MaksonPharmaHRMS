import { CloseIcon } from './navIcons';

type SidebarBrandHeaderProps = {
  companyName: string;
  companyLogo?: string | null;
  collapsed?: boolean;
  onClose?: () => void;
  onToggleCollapsed?: () => void;
};

function BrandLogo({
  companyLogo,
  companyInitial,
  className = 'w-7 h-7',
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
        className={`${className} rounded-md object-contain sidebar-logo-bg p-0.5 shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${className} rounded-md sidebar-logo-bg flex items-center justify-center font-bold text-[10px] shrink-0 select-none`}
      aria-hidden
    >
      {companyInitial}
    </div>
  );
}

export function SidebarBrandHeader({
  companyName,
  companyLogo,
  collapsed = false,
  onClose,
  onToggleCollapsed,
}: SidebarBrandHeaderProps) {
  const companyInitial = companyName.charAt(0).toUpperCase();

  return (
    <div className="sidebar-brand border-b sidebar-divider flex items-center gap-1.5 shrink-0 overflow-hidden">
      <div className={`flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden ${collapsed ? 'lg:hidden' : ''}`}>
        <BrandLogo companyLogo={companyLogo} companyInitial={companyInitial} />
        <h1 className="sidebar-brand-name flex-1 min-w-0 font-bold" title={companyName}>
          {companyName}
        </h1>
      </div>

      {collapsed && (
        <div className="hidden lg:flex flex-1 justify-center min-w-0">
          <BrandLogo companyLogo={companyLogo} companyInitial={companyInitial} />
        </div>
      )}

      {onToggleCollapsed && (
        <button
          type="button"
          className="sidebar-icon-btn hidden lg:flex w-6 h-6 rounded-md items-center justify-center shrink-0 touch-target-sm"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleCollapsed}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={collapsed ? 'rotate-180' : ''}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {onClose && (
        <button
          type="button"
          className="sidebar-icon-btn lg:hidden w-8 h-8 rounded-md flex items-center justify-center shrink-0 touch-target"
          aria-label="Close menu"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}
