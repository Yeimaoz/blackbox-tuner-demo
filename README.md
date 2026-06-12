# blackbox-tuner demo

Synthetic interactive demo for Optuna-style tuning cases.

## Local preview

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
npm run test:e2e
```

## Known Limitations

**`PUBLIC_API_NAMES` in `src/api-copy.ts` is static documentation copy.**
It is a hardcoded list of display names for the UI overlay and snapshot tests.
It is not a live reflection of the `blackbox-tuner` package exports.
Do not infer actual package API shape from this constant.

**`innerHTML` injection surface (XSS).**
Several `innerHTML` assignments in `src/app.ts` insert strings derived from
`cases.ts` / `engine.ts` data (event types, item titles, tags, notes) without
HTML-escaping.  All current data sources are hardcoded constants so there is no
real injection path.  If any data source is changed to accept external input
(URL params, API responses), those positions will become XSS sinks and must be
escaped or replaced with DOM APIs.

**E2E tests run against the Vite dev server, not the production build.**
`playwright.config.ts` starts `npm run dev -- --port 4173` rather than
`npm run preview` (production bundle).  CI therefore does not verify the
production build.  A future improvement is to run `npm run build` before the
e2e step and use `vite preview` as the web server.

**CI workflow runs e2e tests before `npm run build`.**
In `.github/workflows/deploy.yml` the order is: `npm test` → `npm run test:e2e`
→ `npm run build`.  A successful e2e run does not imply the production build
passes.  Consider reordering to build first and run e2e against the preview
server.
