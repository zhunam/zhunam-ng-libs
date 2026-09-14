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
| Data Grid | [`@zhunam/data-grid`](https://www.npmjs.com/package/@zhunam/data-grid) | 1.1.0 | Table with column sorting, pagination, and row selection. |
| Form Builder | [`@zhunam/form-builder`](https://www.npmjs.com/package/@zhunam/form-builder) | 1.1.0 | Dynamic reactive forms from a declarative field configuration. |
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

```sh
npm install
npx nx serve portfolio-showcase
```

```sh
# production build
npx nx build portfolio-showcase --configuration=production

# tests for any project (a library or the app)
npx nx test <project-name>
```

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
