# Martin Spatovaliyski’s portfolio

Custom React/Vite portfolio, private Supabase editor, and generated HTML for the existing Nginx VPS. The old Next.js site and WordPress deployment are untouched. The implementation specification is [portfolio-implementation-plan.md](portfolio-implementation-plan.md).

## Run locally

Use Node **24.16.0** and npm. Dependencies and `package-lock.json` are pinned.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/` and `/admin/`. `.env.local` contains the supplied Portfolio URL and publishable key and is ignored. Copy `.env.example` on another machine. Privileged values must never use a `VITE_` prefix.

```sh
npm run verify
npx playwright install chromium
npm run test:browser
npm run preview
```

Production preview is `http://127.0.0.1:4173/`. It serves `dist/client`, including substantive HTML, canonical navigation, legacy redirects, and real 404s. The preview server can be stopped with Ctrl+C. Local evidence previews include real product screenshots and archived articles; they are not production-approved content.

## Source quality

Use `npm run format` to apply the shared Prettier configuration. `npm run verify` checks formatting, ESLint with zero warnings, strict TypeScript, tests, the production build, and its bundle boundaries. These checks also run in CI. The compiler and lint-tool versions are pinned to compatible supported releases; dependency peer checks are not bypassed.

Public rendering is divided into the site shell, header/footer, homepage, content pages, project rows and career timeline in `src/public`. Development HTML links its global and scoped stylesheets directly, so CSS blocks the first paint instead of waiting for client JavaScript. Vite still owns CSS Modules and hot updates. Restart `npm run dev` after changes to the development server itself.

## Boundaries

- `src/public` contains the public components. The public entry hydrates the identical escaped snapshot embedded by `src/entry-server.tsx`. Public bundles exclude the admin and Supabase client. No public route reads Supabase or GitHub.
- `src/admin` provides password/recovery/TOTP flows, structured editors, explicit Save and debounced autosave, version conflicts, revision restore, private media, incoming references, viewport preview, saved-revision diffs, publication/retry, and rollback.
- `src/domain` validates version 1 content, blocks, references, metrics, palette contrast, routes, curation, publication, and privacy removal. Markdown cannot contain raw HTML or executable embeds. Layout structure stays in source; copy, supported palette, navigation, ordering, visibility, and blocks are editable.
- Database writes append revisions transactionally and require the expected version. Owner policies require the protected UUID and `aal2`, including Storage. Originals cannot be overwritten or deleted by the editor.
- Owner-only functions authenticate the bearer session and enforce MFA before privileged operations. Machine access uses a separate server secret, approved release retrieval, curated snapshot exchange, and deployment reporting. Limits and job leases are enforced in Postgres.
- Selecting a revision publishes that saved version even if a newer draft is saved during a build. Unselected records retain the existing release. Unreferenced media is removed from the public snapshot; original files and history remain private.
- A release is immutable content. Rollback creates a new UUID and increasing generation from a retained deployed snapshot. Repository privacy removals invalidate affected releases and purge curation, repository references and source links, including when another release is pending.

## Supabase status and owner setup

Public signup and anonymous authentication stay disabled. TOTP stays enabled. The original-media bucket stays private. Content, publication, and automation functions are deployed. The owner account id, machine token, and publishable key live only in the protected host environment, never in this repository.

Open the editor and use **Recover access** to set a password of at least 12 characters. Then enroll an authenticator. Content remains inaccessible before MFA. Before enrollment, retain access to the trusted Supabase organization account and document the recovery procedure in [docs/operations.md](docs/operations.md). An authenticator recovery/reset is a trusted operator operation, never a browser bypass.

An owner MFA access token can be supplied through a temporary process environment for imports/backup. Obtain it only from the authenticated editor session on your trusted device; do not paste it into chat, commit it, or store it in a tracked file. Scripts use the official client and normal policies.

```sh
npm run seed:drafts
npm run import:wordpress
npm run backup
```

`seed:drafts` uploads the selected immutable originals and creates starter drafts, preserving existing authored records. The WordPress importer is idempotent by source-site/type/original ID, copies the 40 exported originals, preserves UTC article timestamps and career month precision, maps custom fields, and prepares **57** draft records. The existing availability value remains **false**. Missing/unsupported source elements remain in the ignored `migration-export` archive and its reconciliation report; they are never executed. `--local` prepares an import without accessing Supabase.

The admin’s **Import starter drafts** action can prepare editable records immediately. Follow with `seed:drafts` to upload their real originals and correct media metadata. Preview warns when originals are missing. Production publication requires those private originals and approved metadata.

## Deployment setup

Use a separate **private** source repository to keep development originals and editorial fixtures private. Do not replace `portfolio-next`. Add `GITHUB_REPOSITORY` and an Actions-write `GITHUB_DISPATCH_TOKEN` as Portfolio Edge secrets. Set a random machine token of at least 32 characters as `PORTFOLIO_MACHINE_TOKEN` in both protected GitHub secrets and Portfolio Edge secrets. Provider setup is restricted to this Portfolio project; no paid upgrade is required.

The workflows are ready:

- `ci.yml`: strict typing, domain/database/import/recovery tests, generated HTML, bundle/credential checks, Linux activation tests, browser accessibility/navigation/performance checks.
- `deploy.yml`: fetch approved release ID and signed originals, build from that fixed snapshot, verify, upload a separate candidate over pinned SSH, recheck approval, smoke-test, atomically activate, and report status.
- `github-sync.yml`: hourly public REST synchronization; deployed editorial content refreshes approximately every six hours. Bounded pagination and per-dataset timestamps/coverage expose partial and stale results. Activity counts distinct owner-authored, non-merge default-branch commits in the previous 90 days using UTC dates. Private contribution aggregates are disabled.
- `reconcile.yml`: compare the actual VPS manifest with backend status and recover delayed/lost callbacks.

Set GitHub environment **production** values:

| Name                            | Location         | Purpose                                                                                       |
| ------------------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Variable         | Project URL, for example `https://your-project.supabase.co`                                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Variable         | Supplied public admin key                                                                     |
| `PORTFOLIO_SSH_TARGET`          | Variable         | `deployment-user@host`                                                                        |
| `PORTFOLIO_DEPLOY_ROOT`         | Variable         | `/srv/portfolio` by default                                                                   |
| `PORTFOLIO_SSH_KEY`             | Secret           | Dedicated deployment key                                                                      |
| `PORTFOLIO_SSH_KNOWN_HOSTS`     | Secret           | Independently verified SSH host key; never use blind host scanning                            |
| `PORTFOLIO_MACHINE_TOKEN`       | Secret           | Narrow automation credential                                                                  |
| `GITHUB_PUBLIC_TOKEN`           | Secret, optional | Read-only public GitHub acquisition; six repositories also work without it within rate limits |

The VPS needs Nginx, bash, Python 3, curl, tar, flock, and a dedicated deployment directory/user. The deployer needs narrowly scoped passwordless `nginx -t` and `systemctl reload nginx`, not general sudo. Install `deploy/portfolio-security.conf` as `/etc/nginx/snippets/portfolio-security.conf`, adapt `deploy/nginx.conf` to the preserved TLS/site configuration, and create the initial `current` release/redirect map before enabling that include. Verify with `nginx -t`. See [docs/operations.md](docs/operations.md) for first cutover and recovery.

VPS access, the new source repository, CI/dispatch secrets, and first production activation are intentionally pending your later configuration. No live website was switched.

## Proof and remaining launch gates

The implementation is checked with actual PostgreSQL policies/functions using isolated PGlite data, deterministic importer/recovery tests, and production Chromium/axe checks. Strict structural schemas also run natively through `pg_jsonschema`, with additional database guards for unsafe Markdown/URLs. PGlite omits that extension: its policy/concurrency tests use a type-compatible stub, while CI has a native isolated local-Supabase proof. A read-only native smoke check of synthetic public fixtures also passed in the dedicated project without content/auth writes. Build proof is written to `dist/build-proof.json`; mobile lab measurements and screenshots are in `test-results`. Lab measurements are local checks, not production field INP or real-device certification.

Local verification covers formatting, ESLint, strict TypeScript, 15 domain/database/import/recovery tests, 7 production browser tests and 2 development styling regressions. Browser route, redirect, navigation and gallery checks read the built release snapshot, so dashboard edits do not need corresponding source edits. Development checks delay CSS and JavaScript, exercise navigation and read scoped styles with JavaScript disabled. Native local-Supabase and Linux activation checks are configured in CI; Docker and Linux `flock` are unavailable on this Windows machine. The lockfile is prepared locally; no files have been staged or committed, and no remote has been created.

Before production publication:

- Upload the updated approved PDF CV; the historical PDF is preserved for recovery only.
- Reconcile career dates, CILECT’s June/July 2021 discrepancy, current Crownpeak details, and qualifications.
- Replace review placeholders with approved Bausy/professional/addon engineering notes and evidence. Bausy, CILECT and featured PlateSCT need hero evidence and two complete owner-approved decisions each. Store listings support product features, not architecture or adoption claims.
- Confirm publication rights and contextual image text, including client images and sBoard evidence.
- Preserve the three numeric article redirects and retained collection routes.
- Configure providers, verify the actual VPS/security headers/caching, export content and every original, rehearse independent restoration and production rollback, and complete real-device/screen-reader/zoom checks.

The production validator blocks missing CV/evidence, incomplete decisions or metrics, unapproved media rights, review placeholders, broken references/routes, unsafe blocks, and inadequate palette contrast. Editorial review and provider setup cannot be replaced by generated claims.
