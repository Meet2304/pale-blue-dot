# GitHub Actions quality gates

- **Date:** 20 August 2026
- **Branch:** `chore/ci-quality-gates`
- **Why:** Keep the production build stable. Catch formatting, lint, type, and
  compile failures before anything lands on `main`.

This is the first CI layer, not the full test suite. Integration, end-to-end,
and visual tests are intentionally out of scope and should be added later.

## What changed

A GitHub Actions workflow now runs on every pull request, every push to
`main`, merge-queue checks, and manual `workflow_dispatch` runs.

The checks:

| Check        | Command                            | What it proves                        |
| ------------ | ---------------------------------- | ------------------------------------- |
| Format       | `npm run format:check`             | Prettier (incl. Tailwind class order) |
| Lint         | `npm run lint -- --max-warnings=0` | ESLint + Next.js Core Web Vitals      |
| Typecheck    | `npm run typecheck`                | `next typegen` then `tsc --noEmit`    |
| Build        | `npm run build`                    | Next.js production compile succeeds   |
| Quality gate | Aggregates the jobs above          | One required status check for `main`  |

`npm ci` is used in every job, so a lockfile that does not match
`package.json` fails the pipeline before any of the checks run.

## Files

| Path                       | Role                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.github/workflows/ci.yml` | The workflow. Parallel format / lint / typecheck, then a cached production build, then a single `Quality gates` job that fails if any of those failed. |
| `.nvmrc`                   | Pins CI and local Node to `20`, which matches Next.js 16 and `@types/node`.                                                                            |
| `.gitattributes`           | Forces LF line endings so Prettier does not fail on Windows checkouts while CI runs on Linux.                                                          |
| `.prettierrc.json`         | Sets `endOfLine: "lf"` to match `.gitattributes`.                                                                                                      |
| `.prettierignore`          | Ignores `.nvmrc`, `.gitattributes`, and `.claude` (no parser / local-only).                                                                            |
| `package.json`             | Adds `npm run ci` (the same four checks, sequential) and an `engines.node` field (`>=20.9.0`).                                                         |
| `README.md`                | Documents `npm run ci`.                                                                                                                                |

## How the workflow is shaped

- **Concurrency.** A new push to the same PR cancels the previous run so stale
  results do not linger.
- **Least privilege.** `permissions: contents: read` only. The workflow does
  not deploy, comment, or write to the repo.
- **Fail-fast off for the matrix.** Format, lint, and typecheck all run even
  if one of them fails, so one push surfaces every cheap failure at once.
- **Build is its own job.** It is slower, caches `.next/cache`, and does not
  block the lint/format/typecheck matrix from starting.
- **One required check.** Branch protection should require the job named
  **Quality gates**, not the individual matrix legs. That job exists only to
  AND the others together.

Action versions current as of this date: `actions/checkout@v6`,
`actions/setup-node@v7`, `actions/cache@v5`.

## How this protects production

GitHub Actions does **not** by itself stop Vercel from deploying. The gate is:

1. Open a PR into `main`.
2. This workflow must be green.
3. Merge. Vercel then deploys production from `main`.

Do this in GitHub so that step 3 cannot skip step 2:

- Settings → Branches → protect `main`
- Require a pull request before merging
- Require status checks to pass: **Quality gates**
- Do not allow bypassing the check (including your own account, if you can
  live with that)

Until that protection is on, a direct push to `main` can still ship while CI
is running.

## Run the same checks locally

```bash
npm run ci
```

That is format → lint (warnings are errors) → typecheck → production build.
Use the individual scripts if you only need one of them; see the README.

Node 20.9+ is required. If `nvm` or `fnm` is installed, `.nvmrc` will select
it.

## What this does not cover yet

Leave these for a later PR. They are real tests, but they are not “is the
build stable?” tests:

- Unit tests (Vitest / Jest)
- Component tests
- Playwright / integration tests against a preview URL
- Visual regression
- `npm audit` as a blocking gate (useful, but it can fail on advisory noise
  unrelated to whether the site builds)
- Deploying from Actions (`vercel build` / `vercel deploy --prebuilt`). Vercel
  Git integration still owns deploys.

Existing plan files that were not Prettier-clean were wrapped in this same
change. Otherwise the new `format:check` job would fail on `main` on the
first run.

## Future-me notes

- Typecheck must run `next typegen` before `tsc`. `LayoutProps` / `PageProps`
  live in generated files (`next-env.d.ts`, `.next/types`) that are gitignored.
  A clean CI checkout does not have them. That is why PR #3's Typecheck job
  failed with `Cannot find name 'LayoutProps'` while Build (which generates
  the types itself) passed.
- Line endings are LF (`.gitattributes` + Prettier `endOfLine: "lf"`). If
  `format:check` fails only on Windows after a checkout, the working tree is
  still CRLF — run `git checkout -- .` once this change is on the branch.
- If a check starts failing only in CI, run `npm ci` then `npm run ci` on a
  clean tree. Local `node_modules` drift is the usual cause.
- Adding a real test runner later: keep it as another matrix entry or a new
  job, and add it to the `needs:` list of **Quality gates**.
- If Prettier and ESLint ever disagree, `eslint-config-prettier` is already
  last in `eslint.config.mjs`. Formatting stays Prettier’s job.
