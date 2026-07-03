type Props = {
  companyName: string;
  companyLogo?: string | null;
};

export function AuthBrandHeader({ companyName, companyLogo }: Props) {
  const initial = companyName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 mb-6">
      {companyLogo ? (
        <img
          src={companyLogo}
          alt=""
          className="w-12 h-12 rounded-lg object-contain bg-surface2 border border-border p-1 shrink-0"
        />
      ) : (
        <div
          className="w-12 h-12 rounded-lg bg-primary-bg text-primary-on-bg flex items-center justify-center font-bold text-lg shrink-0"
          aria-hidden
        >
          {initial}
        </div>
      )}
      <p className="text-[11px] tracking-[2px] uppercase text-text-muted font-semibold leading-snug min-w-0">
        {companyName}
      </p>
    </div>
  );
}
