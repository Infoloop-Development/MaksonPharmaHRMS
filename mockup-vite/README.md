# MAMS Mockup - Vite + React port

Faithful, "same-to-same" port of [`../mockup/index.html`](../mockup/index.html) into a Vite + React + TypeScript project.

**Purpose:** UX reference / shareable preview. Visual rendering is identical to the HTML mockup, but you get HMR for fast iteration and a proper production build for hosting.

This is **NOT** the production codebase. The production build lives in [`../mams/mams-web/`](../mams/mams-web/) and is a clean-slate rewrite using the design tokens.

## Run

```bash
npm install
npm run dev          # http://localhost:5174
npm run build        # static bundle in dist/
npm run preview      # preview the production build
```

## Layout

```
mockup-vite/
├── index.html               Vite entry (loads DM Sans + JetBrains Mono via Google Fonts)
├── vite.config.ts           Vite config (port 5174, sourcemaps on)
├── tsconfig.json            Loose TS - the original is JS so we don't strict-check
├── src/
│   ├── main.tsx             React 18 createRoot bootstrap
│   ├── App.tsx              The entire mockup, extracted verbatim from mockup/index.html lines 341-1794
│   └── styles/
│       └── mockup.css       Extracted verbatim from mockup/index.html lines 12-335
└── dist/                    Production build output (gitignored)
```

## Notes on the port

- `App.tsx` has `// @ts-nocheck` because the original is plain JS using `var` and untyped functions. The whole point of this artifact is faithful visual rendering, not idiomatic TS. If you want idiomatic TS components, see `../mams/mams-web/`.
- The mockup uses `const { useState, useMemo, useEffect } = React;` — that line is replaced with proper named imports at the top of `App.tsx`.
- The mockup ends with `ReactDOM.render(<App/>, ...)` — that line is removed; bootstrap moved to `main.tsx` using React 18's `createRoot`.
- Everything else (1,400+ lines of components and inline styles) is byte-for-byte identical to the original mockup.

## Hosting

```bash
npm run build
# Deploy dist/ to Netlify, Vercel, or any static host.
```

Compared to the single-file HTML mockup, the Vite build is ~3x smaller (esbuild + tree-shaking) and loads instantly because there's no in-browser Babel compilation step.
