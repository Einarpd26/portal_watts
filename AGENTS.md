<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Code Review Rules

## General
REJECT if:
- Hardcoded secrets or credentials (API keys, passwords, private tokens)
- Explicit `any` type in TypeScript without justification
- Empty catch blocks (silent error swallowing)
- `console.log` statements left in production code (prefer structured logger)
- Obvious code duplication violating DRY principles

## TypeScript & React / Next.js
REJECT if:
- `import * as React` → use named imports e.g. `import { useState }`
- Arbitrary inline colors or styles when Tailwind classes are available
- Missing `"use client"` in components that use hooks or browser-only APIs
- Unhandled Promise rejections or asynchronous errors

PREFER:
- `cn()` utility for conditional class merging
- Named exports over default exports
- Semantic HTML tags over non-semantic `div` wrappers

## Response Format
FIRST LINE must be exactly:
STATUS: PASSED
or
STATUS: FAILED

If FAILED, list each violation formatted as:
`file:line - rule violated - issue`
