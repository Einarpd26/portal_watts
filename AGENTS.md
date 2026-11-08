<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Code Review Rules

These rules are read by the pre-commit reviewer (GGA, see `.gga`). Only the REJECT items can make the review fail;
PREFER items are suggestions and must never change the status to FAILED.

## General
REJECT if:
- Hardcoded secrets or credentials (API keys, passwords, private tokens)
- Explicit `any` type in TypeScript without justification
- Empty catch blocks (silent error swallowing)
- `console.log` statements left in production code (use the structured `logger` from `@/lib/logger`)
- Obvious code duplication violating DRY principles
- `createAdminClient` (service-role client) or the service-role key referenced from a component, hook or page
  (`src/components`, `src/hooks`, `src/pages` outside `src/pages/api`): it bypasses authorization and must stay server-side
- A new API route under `src/pages/api` (other than `src/pages/api/auth/*`) that reads or writes data before
  authenticating the caller (`requireCallerAuth` or the shared helper in `@/lib/rutasApi`)
- A TypeScript `enum` for domain values: use a string union (`type Frecuencia = 'semanal' | 'par'`), as the database uses text + CHECK

## TypeScript & React / Next.js
REJECT if:
- `import * as React` → use named imports e.g. `import { useState }`
- Static inline `style` props or hardcoded colors when a Tailwind class exists. The only accepted inline `style` is a value
  computed at runtime from data (e.g. the color of a slot), and it must carry a comment saying so
- Class names built with template literals or string concatenation that interpolate a condition or a prop →
  use `cn()` from `@/utils/cn`
- Missing `"use client"` in components that use hooks or browser-only APIs
- Unhandled Promise rejections or asynchronous errors

PREFER (never blocks):
- `cn()` for any conditional class merging
- Named exports for new modules that are not Next.js pages. Pages under `src/pages` must use a default export, and
  many existing components do too: do not flag existing default exports
- Semantic HTML tags over non-semantic `div` wrappers
- Tailwind scale utilities over arbitrary values (`w-[200px]`) when an equivalent exists; existing arbitrary values are tolerated

## Project conventions (do not flag)
- UI text, error messages and comments are written in Spanish; identifiers mix Spanish and English. Language is not a violation.
- MapLibre style expressions use hexadecimal color strings because map layers cannot read Tailwind classes.
- Files under `tests/` are not reviewed.

## Response Format
FIRST LINE must be exactly:
STATUS: PASSED
or
STATUS: FAILED

If FAILED, list each violation formatted as:
`file:line - rule violated - issue`
