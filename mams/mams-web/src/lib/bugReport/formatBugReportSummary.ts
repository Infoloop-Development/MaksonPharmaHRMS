import type { BugReportDetail } from '@mams/types';

const ANALYSIS_PROMPT = `You are a senior software engineer reviewing a user-submitted bug report from the Makson Attendance Management System (MAMS). Using ONLY the evidence in the "Bug report data" section below, produce a detailed technical analysis report that includes:

1. **Issue summary** — Plain-language description of what the user experienced and the impact.
2. **Expected vs actual behavior** — Infer from the description, route, and context.
3. **Reproduction steps** — Ordered steps derived from the breadcrumb trail, route, module, and description.
4. **Likely root cause(s)** — Rank hypotheses using console errors, failed API calls, route/module, user role, and session context.
5. **Affected areas** — Modules, routes, API endpoints, permissions, and user roles involved.
6. **Recommended fixes** — Concrete changes (frontend, backend, validation, RBAC, data handling, etc.) with specific areas of the codebase to inspect when inferable from the evidence.
7. **Implementation plan** — Prioritized, step-by-step work items a developer can follow.
8. **Testing and verification** — How to confirm the fix works and what regressions to watch for.
9. **Open questions and gaps** — Anything unclear from the report; state assumptions explicitly instead of asking follow-up questions unless critical data is missing.

Be specific, actionable, and thorough. Base conclusions on the evidence provided.`;

export function formatBugReportSummary(report: BugReportDetail): string {
  const reproSteps = report.breadcrumbs
    .map((b, i) => `${i + 1}. [${b.ts}] ${b.action}`)
    .join('\n');

  const consoleSection = report.consoleLog.length
    ? report.consoleLog.map((e) => `[${e.ts}] [${e.level}] ${e.message}`).join('\n')
    : '(none captured)';

  const networkSection = report.failedRequests.length
    ? report.failedRequests
        .map(
          (r) =>
            `[${r.ts}] ${r.method} ${r.path} → HTTP ${r.status}${r.body ? `\n  Response body: ${r.body}` : ''}`
        )
        .join('\n\n')
    : '(none captured)';

  const assigneeLine = report.assignee
    ? `${report.assignee.name} (${report.assignee.email})`
    : 'Unassigned';

  const sessionSeconds = Math.round(report.context.sessionDurationMs / 1000);

  return `${ANALYSIS_PROMPT}

---
# Bug report data

## Report metadata
- **Report ID:** ${report.id}
- **Title:** ${report.title}
- **Severity:** ${report.severity}
- **Status:** ${report.status}
- **Module:** ${report.module}
- **Route:** ${report.route}
- **Screenshot attached:** ${report.screenshotDataUrl ? 'Yes (available in the bug report detail view)' : 'No'}
- **Video walkthrough attached:** ${report.hasVideo ? `Yes — file at \`${report.videoFilePath ?? 'unknown path'}\` (view in bug report detail)` : 'No'}
- **Reported at:** ${report.createdAt}
- **Last updated:** ${report.updatedAt}

## Reporter
- **Name:** ${report.reporter.name}
- **Email:** ${report.reporter.email}
- **Role:** ${report.reporter.role}
- **User ID:** ${report.reporter.id}

## Assignee
- **Current assignee:** ${assigneeLine}${report.assignee ? `\n- **Assignee user ID:** ${report.assignee.id}` : ''}

## User description
${report.description}

## Inferred reproduction steps (breadcrumb trail)
${reproSteps || '(none captured)'}

## Console log
\`\`\`
${consoleSection}
\`\`\`

## Failed network requests
\`\`\`
${networkSection}
\`\`\`

## Session and environment context
- **Browser:** ${report.context.browser}
- **Operating system:** ${report.context.os}
- **Viewport:** ${report.context.viewport}
- **User role at time of report:** ${report.context.role}
- **Session duration before report:** ${sessionSeconds}s (${report.context.sessionDurationMs} ms)
- **Route at capture:** ${report.context.route}
- **Module at capture:** ${report.context.module}
- **App version:** ${report.context.appVersion ?? 'not recorded'}
${report.transcriptionText ? `
## Video transcription (offline, auto-detected)
- **Detected language:** ${report.detectedLanguage ?? 'unknown'}
- **Confidence:** ${report.transcriptionConfidence != null ? `${Math.round(report.transcriptionConfidence * 100)}%` : 'n/a'}
- **Generated at:** ${report.transcriptionGeneratedAt ?? 'n/a'}

${report.transcriptionText}
` : ''}`;
}
