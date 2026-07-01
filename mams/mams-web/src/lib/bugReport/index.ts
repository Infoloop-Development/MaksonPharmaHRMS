import { initConsoleBuffer } from './consoleBuffer.js';

export function initBugReportInstrumentation(): void {
  initConsoleBuffer();
}

export {
  getConsoleBufferSnapshot,
} from './consoleBuffer.js';
export {
  getFailedRequestsSnapshot,
  recordFailedRequest,
  sanitizeNetworkBody,
} from './networkBuffer.js';
export {
  getBreadcrumbsSnapshot,
  pushBreadcrumb,
  clickLabelFromElement,
  formSubmitLabel,
} from './breadcrumbTracker.js';
export {
  ensureSessionStart,
  resetSessionStart,
  getSessionDurationMs,
  buildBugReportContext,
  moduleFromRoute,
} from './sessionContext.js';
export { captureViewportScreenshot } from './captureScreenshot.js';
