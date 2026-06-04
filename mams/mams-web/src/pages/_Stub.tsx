export function Stub({ title, reference }: { title: string; reference: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-sm text-text-muted mb-6">
        This page is a scaffold stub. The team will build it out per the referenced spec.
      </p>
      <div className="card p-5 max-w-xl">
        <div className="text-xs uppercase tracking-wider text-text-subtle mb-2">Reference</div>
        <div className="text-sm font-medium">{reference}</div>
        <div className="mt-4 text-xs text-text-muted leading-relaxed">
          See <code className="bg-surface2 px-1.5 py-0.5 rounded font-mono">../docs/development-scope.md</code>{' '}
          and the corresponding tech-doc PDF for the full spec.
          <br />
          Approved mockup:{' '}
          <a
            href="https://makson-payroll-mockup.netlify.app"
            className="text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            makson-payroll-mockup.netlify.app
          </a>
        </div>
      </div>
    </div>
  );
}
