import type { PublicVisitorFormBranding } from '../../api/publicVisitor';

export function VisitorFormPublicHeader({
  branding,
}: {
  branding: PublicVisitorFormBranding;
}) {
  return (
    <div className="mb-6 pb-4 border-b border-border">
      <div className="flex items-start gap-3">
        {branding.companyLogo && (
          <img
            src={branding.companyLogo}
            alt="Company logo"
            className="w-12 h-12 object-contain rounded-md shrink-0"
          />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text leading-snug">{branding.companyName}</p>
          {branding.registeredAddress && (
            <p className="text-xs text-text-muted mt-1 leading-relaxed">{branding.registeredAddress}</p>
          )}
        </div>
      </div>
    </div>
  );
}
