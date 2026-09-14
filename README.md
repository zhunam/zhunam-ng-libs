# zhunam-ng-libs

<img src="apps/portfolio-showcase/public/apple-touch-icon.png" alt="zhunam logo" width="72">

Angular frontend developer portfolio, built as an Nx monorepo. Every
piece under `libs/*` is a real, independently published npm package,
not just a demo: each one can be installed in a third-party Angular
project on its own. `apps/portfolio-showcase` is the one piece that
isn't published: it consumes and demonstrates the libraries together,
over real use cases and real data.

Live site: **https://zhunam-dev.vercel.app**

## Featured: Crypto Market Dashboard

The most recent piece, and the one that ties the other libraries
together: a live crypto market dashboard (real data from the CoinGecko
public API, no backend of its own) that uses `@zhunam/data-grid`,
`@zhunam/form-builder`, and `@zhunam/pdf-generator` in one page. See its
own
[README.md](apps/portfolio-showcase/src/app/pages/crypto-dashboard/README.md)
for which API of each library it consumes and why.

## Libraries

| Library | Package | Version | What it does |
| --- | --- | --- | --- |
| Data Grid | [`@zhunam/data-grid`](https://www.npmjs.com/package/@zhunam/data-grid) | 2.0.0 | Table with column sorting, pagination, and row selection. |
| Form Builder | [`@zhunam/form-builder`](https://www.npmjs.com/package/@zhunam/form-builder) | 1.2.0 | Dynamic reactive forms from a declarative field configuration. |
| Auth | [`@zhunam/auth`](https://www.npmjs.com/package/@zhunam/auth) | 1.0.0 | Unified wrapper over Firebase Auth and Supabase Auth, with a route guard and ready-made forms. |
| PDF Generator | [`@zhunam/pdf-generator`](https://www.npmjs.com/package/@zhunam/pdf-generator) | 1.1.0 | Client-side PDF documents from a declarative, typed template, with a live preview component. |
| Calendar | [`@zhunam/calendar`](https://www.npmjs.com/package/@zhunam/calendar) | 1.0.0 | Signal-based event store with real RRULE recurrence, an optional Google Calendar connector, and a month/week/day UI component. |

Each library has its own `README.md` (installation, usage example, full
API table) linked from its row above, and its own `CHANGELOG.md` with
its release history.

## Stack

Angular (Nx monorepo), TypeScript, Signals interoperable with RxJS.
Libraries under `libs/*` ship encapsulated SCSS with no utility
framework dependency, so they don't require the consumer to have
Tailwind or Bootstrap installed. `apps/portfolio-showcase` itself is
free to use Tailwind + DaisyUI, since it's never published.

## Repository structure

```
zhunam-ng-libs/
  apps/
    portfolio-showcase/   # consumes the libraries, not published
  libs/
    data-grid/
    form-builder/
    auth/
    pdf-generator/
    calendar/
```

## Running locally

`portfolio-showcase`'s crypto dashboard needs `COINGECKO_API_KEY` set
first, see [Environment variables](#environment-variables) below.

```sh
npm install
npx nx serve portfolio-showcase
```

```sh
# production build
npx nx build portfolio-showcase --configuration=production

# tests for any project (a library or the app), never needs COINGECKO_API_KEY
npx nx test <project-name>
```

## Environment variables

`portfolio-showcase` needs one build-time environment variable:

| Variable | Where to get it | Required for |
| --- | --- | --- |
| `COINGECKO_API_KEY` | [coingecko.com](https://www.coingecko.com/en/api/pricing) free Demo plan | `nx build`, `nx serve` (not `nx test`, which never calls the real API) |

It's injected at build time, never committed in source. A pre-build
script (`apps/portfolio-showcase/scripts/generate-env.mjs`, wired via
`dependsOn` in `apps/portfolio-showcase/project.json`) reads it from
`process.env`, falling back to a `.env` file one level above the repo
root (see below), and generates a gitignored
`environments/environment.generated.ts`. `nx build`/`nx serve` fail
with a clear error if it isn't set anywhere; `nx test` runs fine
without it (writes a harmless placeholder instead, since no test calls
the real API). See `apps/portfolio-showcase/ROADMAP.md` for the full
rationale behind this, including the earlier, now-replaced approach.

**Local development, option A (persistent, recommended):** add a
`COINGECKO_API_KEY=your-key` line to the `.env` file one level above
this repo's root (`../.env` from the repo root), per this repo's own
convention for local secrets (see `AGENTS.md` > "Environment variables
and secrets"). Picked up automatically, no need to export anything in
each new terminal:

```sh
npx nx serve portfolio-showcase
```

**Local development, option B (per-terminal session):**

```sh
# bash / WSL
export COINGECKO_API_KEY=your-key
npx nx serve portfolio-showcase
```

```powershell
# PowerShell
$env:COINGECKO_API_KEY = "your-key"
npx nx serve portfolio-showcase
```

**Vercel:** Project Settings → Environment Variables → add
`COINGECKO_API_KEY` with the real value, applied to both Production and
Preview environments. Vercel injects it into the build's `process.env`
automatically, no other configuration needed.

## Deployment

`portfolio-showcase` deploys automatically to Vercel on every push to
`master`, via `.github/workflows/deploy.yml`. Live site:
https://zhunam-dev.vercel.app

The build runs with `nx build portfolio-showcase --configuration=production`
(not Vercel's native build, which doesn't know about the dependencies
between libraries in this monorepo), configured in `vercel.json` via
explicit `buildCommand`/`outputDirectory`.

Real troubleshooting note: Vercel access tokens scoped to a single
project (`Project` scope) have a known bug as of this deployment
(confirmed on Vercel's own community forum) that makes them fail with
"User not found" on `whoami`/`pull`/`deploy`. This repo's `VERCEL_TOKEN`
secret uses `Team` scope instead, not `Project`, until Vercel fixes
that bug.

## License

MIT, both this repository and every package under `libs/*`. See
[LICENSE](LICENSE).

## About

Built by Ariana Mora ([@zhunam](https://github.com/zhunam)).

- [GitHub](https://github.com/zhunam/zhunam-ng-libs)
- [LinkedIn](https://www.linkedin.com/in/ariana-andreina-mora)
