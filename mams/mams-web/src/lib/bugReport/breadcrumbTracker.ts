export interface BreadcrumbEntry {
  action: string;
  ts: string;
}

const MAX = 200;
const MAX_ACTION = 200;

const buffer: BreadcrumbEntry[] = [];

export function pushBreadcrumb(action: string): void {
  const trimmed = action.trim().slice(0, MAX_ACTION);
  if (!trimmed) return;
  buffer.push({ action: trimmed, ts: new Date().toISOString() });
  while (buffer.length > MAX) buffer.shift();
}

export function getBreadcrumbsSnapshot(): BreadcrumbEntry[] {
  return buffer.map((e) => ({ ...e }));
}

export function clickLabelFromElement(el: Element): string | null {
  if (el.closest('[data-sensitive-unmasked="true"]')) return null;
  const tag = el.tagName.toLowerCase();
  if (tag !== 'button' && tag !== 'a' && el.getAttribute('role') !== 'button') return null;

  const aria = el.getAttribute('aria-label')?.trim();
  if (aria) return aria.slice(0, 40);

  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (text) return text.slice(0, 40);

  const title = el.getAttribute('title')?.trim();
  if (title) return title.slice(0, 40);

  return tag;
}

export function formSubmitLabel(form: HTMLFormElement): string {
  const name = form.getAttribute('name') || form.id;
  if (name) return name.slice(0, 40);
  const heading = form.querySelector('h1,h2,h3,h4')?.textContent?.trim();
  if (heading) return heading.slice(0, 40);
  return 'form';
}
