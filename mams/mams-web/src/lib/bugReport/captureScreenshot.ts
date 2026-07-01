import { toJpeg } from 'html-to-image';
import html2canvas from 'html2canvas';

const CAPTURE_IGNORE = '[data-bug-report-ignore]';

function resolveCaptureTarget(): HTMLElement {
  return document.getElementById('root') ?? document.body;
}

function shouldIncludeNode(node: Node): boolean {
  return !(node instanceof Element && node.closest(CAPTURE_IGNORE));
}

function stripDataUrlPrefix(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/\w+;base64,/, '');
}

function syncComputedStyles(original: Element, clone: Element): void {
  if (!(original instanceof HTMLElement && clone instanceof HTMLElement)) return;

  const cs = window.getComputedStyle(original);
  clone.style.color = cs.color;
  clone.style.backgroundColor = cs.backgroundColor;
  clone.style.borderColor = cs.borderColor;
  clone.style.borderWidth = cs.borderWidth;
  clone.style.borderStyle = cs.borderStyle;
  clone.style.fontSize = cs.fontSize;
  clone.style.fontFamily = cs.fontFamily;
  clone.style.fontWeight = cs.fontWeight;
  clone.style.lineHeight = cs.lineHeight;
  clone.style.textAlign = cs.textAlign;
  clone.style.padding = cs.padding;
  clone.style.margin = cs.margin;
  clone.style.display = cs.display;
  clone.style.visibility = cs.visibility;
  clone.style.opacity = cs.opacity;
  clone.style.borderRadius = cs.borderRadius;
  clone.style.boxShadow = 'none';

  const origChildren = original.children;
  const cloneChildren = clone.children;
  for (let i = 0; i < origChildren.length && i < cloneChildren.length; i += 1) {
    syncComputedStyles(origChildren[i]!, cloneChildren[i]!);
  }
}

/** Resolve CSS variables that use color-mix to plain rgb/rgba for html2canvas. */
function injectCaptureSafeCssVars(): () => void {
  const vars = ['--sidebar-active-bg'];
  const rules: string[] = [];

  for (const varName of vars) {
    const probe = document.createElement('div');
    probe.style.position = 'fixed';
    probe.style.left = '-9999px';
    probe.style.backgroundColor = `var(${varName})`;
    document.body.appendChild(probe);
    const resolved = window.getComputedStyle(probe).backgroundColor;
    probe.remove();
    if (resolved && resolved !== 'rgba(0, 0, 0, 0)') {
      rules.push(`${varName}: ${resolved};`);
    }
  }

  if (rules.length === 0) return () => undefined;

  const tag = document.createElement('style');
  tag.id = 'bug-report-capture-safe';
  tag.textContent = `:root { ${rules.join(' ')} }`;
  document.head.appendChild(tag);
  return () => tag.remove();
}

async function captureWithHtmlToImage(target: HTMLElement): Promise<string | null> {
  const dataUrl = await toJpeg(target, {
    quality: 0.72,
    pixelRatio: Math.min(window.devicePixelRatio, 1.25),
    cacheBust: true,
    skipFonts: false,
    filter: (node) => shouldIncludeNode(node),
    width: window.innerWidth,
    height: window.innerHeight,
    style: {
      transform: `translate(-${window.scrollX}px, -${window.scrollY}px)`,
      transformOrigin: 'top left',
    },
  });

  const base64 = stripDataUrlPrefix(dataUrl);
  return base64.length >= 100 ? base64 : null;
}

async function captureWithHtml2Canvas(target: HTMLElement): Promise<string | null> {
  const canvas = await html2canvas(target, {
    useCORS: true,
    allowTaint: true,
    logging: false,
    scale: 1,
    backgroundColor: window.getComputedStyle(document.body).backgroundColor || '#f8f9fb',
    width: window.innerWidth,
    height: window.innerHeight,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    scrollX: -window.scrollX,
    scrollY: -window.scrollY,
    ignoreElements: (el) => !shouldIncludeNode(el),
    onclone: (_clonedDoc, clonedElement) => {
      _clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => el.remove());
      syncComputedStyles(target, clonedElement);
    },
  });

  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL('image/jpeg', 0.72);
  } catch {
    return null;
  }

  const base64 = stripDataUrlPrefix(dataUrl);
  return base64.length >= 100 ? base64 : null;
}

export async function captureViewportScreenshot(): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  const target = resolveCaptureTarget();
  const cleanup = injectCaptureSafeCssVars();

  try {
    const strategies = [
      () => captureWithHtmlToImage(target),
      () => captureWithHtml2Canvas(target),
      () => captureWithHtml2Canvas(document.body),
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result) return result;
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[bug-report] Screenshot strategy failed', err);
        }
      }
    }

    return null;
  } finally {
    cleanup();
  }
}
