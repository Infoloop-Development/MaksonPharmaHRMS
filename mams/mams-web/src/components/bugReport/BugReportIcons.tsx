import type { ReactNode } from 'react';

function Icon({ children, className = 'w-5 h-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function BugReportMonitorIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </Icon>
  );
}

export function BugReportCameraIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </Icon>
  );
}

export function BugReportVideoIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m16 13 5 3V8l-5 3v2z" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </Icon>
  );
}

export function BugReportImageIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </Icon>
  );
}

export function BugReportDragIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function BugReportPauseIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </Icon>
  );
}

export function BugReportPlayIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function BugReportStopIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function BugReportRecordIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </Icon>
  );
}
