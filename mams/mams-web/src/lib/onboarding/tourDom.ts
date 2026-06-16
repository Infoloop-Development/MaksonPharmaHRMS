export function tourSelector(tourId: string) {
  return `[data-tour-id="${tourId}"]`;
}

function isTourTargetVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;

  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
    return false;
  }

  let parent: HTMLElement | null = el.parentElement;
  while (parent) {
    const ps = window.getComputedStyle(parent);
    if (ps.display === 'none') return false;
    parent = parent.parentElement;
  }

  const rect = el.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

function elementArea(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return rect.width * rect.height;
}

/** Prefer the visible, largest matching anchor (handles MobileFilterBar duplicate mounts). */
export function findTourElement(tourId: string): HTMLElement | null {
  const nodes = [...document.querySelectorAll<HTMLElement>(tourSelector(tourId))];
  if (nodes.length === 0) return null;

  const visible = nodes.filter(isTourTargetVisible);
  const candidates = visible.length > 0 ? visible : nodes;

  return candidates.reduce((best, el) => (elementArea(el) > elementArea(best) ? el : best));
}

export function tourElementExists(tourId: string) {
  return findTourElement(tourId) !== null;
}

export function waitForTourElement(tourId: string, timeoutMs = 3000): Promise<boolean> {
  if (tourElementExists(tourId)) return Promise.resolve(true);

  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (tourElementExists(tourId)) {
        resolve(true);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(false);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export async function settleDom(ms = 80) {
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, ms))));
}

export function scrollTourElementIntoView(tourId: string) {
  const el = findTourElement(tourId);
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}

const NARROW_VIEWPORT_MAX_PX = 767;

/** Prefer bottom placement on phones/tablets to avoid clipped side popovers. */
export function resolvePopoverSide(side?: 'top' | 'bottom' | 'left' | 'right'): 'top' | 'bottom' | 'left' | 'right' {
  if (typeof window !== 'undefined' && window.innerWidth <= NARROW_VIEWPORT_MAX_PX) {
    return 'bottom';
  }
  return side ?? 'bottom';
}

const TOUR_LOCK_CLASS = 'mams-tour-target-locked';
const INTERACTIVE_SELECTOR =
  'button, input, select, textarea, a[href], [role="button"], [role="link"], [role="tab"], [contenteditable="true"]';

function isLockableTourElement(el: HTMLElement) {
  return el.isConnected && el !== document.body && el !== document.documentElement;
}

function disableInteractiveControl(control: HTMLElement) {
  if (control.dataset.mamsTourLock === '1') return;
  control.dataset.mamsTourLock = '1';

  if (
    control instanceof HTMLButtonElement ||
    control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLTextAreaElement
  ) {
    control.dataset.mamsTourWasDisabled = control.disabled ? '1' : '0';
    control.disabled = true;
    return;
  }

  if (control instanceof HTMLAnchorElement) {
    control.dataset.mamsTourWasTabindex = String(control.tabIndex);
    control.tabIndex = -1;
  }

  control.setAttribute('aria-disabled', 'true');
}

function restoreInteractiveControl(control: HTMLElement) {
  if (control.dataset.mamsTourLock !== '1') return;

  if (
    control instanceof HTMLButtonElement ||
    control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLTextAreaElement
  ) {
    control.disabled = control.dataset.mamsTourWasDisabled === '1';
    delete control.dataset.mamsTourWasDisabled;
  } else if (control instanceof HTMLAnchorElement && control.dataset.mamsTourWasTabindex !== undefined) {
    const prev = control.dataset.mamsTourWasTabindex;
    control.tabIndex = prev === '' ? 0 : Number(prev);
    delete control.dataset.mamsTourWasTabindex;
  }

  control.removeAttribute('aria-disabled');
  delete control.dataset.mamsTourLock;
}

function lockTourElement(el: HTMLElement) {
  if (!isLockableTourElement(el)) return;
  el.classList.add(TOUR_LOCK_CLASS);
  if (el.matches(INTERACTIVE_SELECTOR)) disableInteractiveControl(el);
  el.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR).forEach(disableInteractiveControl);
}

function unlockTourElement(el: HTMLElement) {
  el.classList.remove(TOUR_LOCK_CLASS);
  if (el.matches(INTERACTIVE_SELECTOR)) restoreInteractiveControl(el);
  el.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR).forEach(restoreInteractiveControl);
}

/** Block accidental clicks on the highlighted tour target and its controls. */
export function lockTourTarget(tourId: string): HTMLElement | null {
  const el = findTourElement(tourId);
  if (!el) return null;
  lockTourElement(el);
  return el;
}

export function unlockTourTarget(tourId: string) {
  document.querySelectorAll<HTMLElement>(tourSelector(tourId)).forEach(unlockTourElement);
}

export function unlockAllTourTargets() {
  document.querySelectorAll<HTMLElement>(`.${TOUR_LOCK_CLASS}`).forEach(unlockTourElement);
  document.querySelectorAll<HTMLElement>('[data-mams-tour-lock="1"]').forEach(restoreInteractiveControl);
}
