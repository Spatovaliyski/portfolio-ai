# Portfolio operations

## Release flow

1. Sign in with password and TOTP. Save records. Review the selected saved-revision diff and validation results. A failed save keeps local edits; a version conflict offers revision history and an explicit discard/reload path.
2. Select exactly the revisions to publish. Requests carry an expected desired release and idempotency key. Publication composes over the existing sanitized release; it never reads unrelated working drafts.
3. The Edge function validates ownership, content, routes, original files, and launch requirements, then creates an immutable approved release. Dispatch failure is visible and retryable.
4. GitHub Actions retrieves the fixed approved snapshot and short-lived original URLs, builds responsive WebP/PDF derivatives and metadata, and runs checks. Only `dist/client` is uploaded. Server bundles, backups, archive, local configuration and draft JSON are excluded.
5. A candidate lives under `releases/<UUID>-<run>-<attempt>`. Activation is serialized with `flock`, independently checks increasing generations, tests uploaded routes/404, adds immutable assets to the shared store, and atomically switches `current`. A Nginx test/reload failure restores the previous symlink. An already active UUID is idempotent and reports its actual manifest without replacing it with another job’s output.
6. Authenticated callbacks record the actual increasing active generation. Delayed callbacks may record an older desired release if it actually activated before a later desired release, but cannot replace a newer active generation. Reconciliation reads `current/release.json` over pinned SSH; invalidated releases remain rejected.

Never switch `current` manually to an older generation during normal rollback. Use **Restore this release** in the editor: it validates the retained content and creates a new generation. Retained shared assets support existing browser tabs and old HTML. Do not prune originals or shared assets until all retained releases/revisions and open-page retention requirements have been reconciled.

## First VPS cutover

The old website must remain live until the new candidate and recovery path are verified.

1. Preserve the current Nginx config, old deployment files, certificates, trusted WordPress/database backup and server-side redirect rules. The public migration archive cannot recover private WP drafts, users or plugin code.
2. Create `/var/www/spatovaliyski.com` and a dedicated deployment user. Install the security snippet. Adapt the provided Nginx configuration to the existing TLS paths and deploy root. The generated redirect map requires an initial populated `current` directory before Nginx parses its include.
3. Prepare and verify the initial release without changing the public server block. On first cutover, install the new server block only after an approved candidate is ready; run `nginx -t`, switch its directory/config under operator control and reload. Preserve a tested command to return to the old site if the initial cutover fails. Later releases use the automated atomic script.
4. Verify HTTPS/HTTP/www canonical redirects, every public route, numeric article redirects, actual unknown-route 404 status, no public SPA fallback, cache/security headers, admin no-store/noindex, and shared immutable files. Verify direct navigation with JavaScript disabled.
5. Activate another approved release and rehearse editor rollback as a new generation. Simulate a failed callback and run reconciliation. Confirm the original deployment remains recoverable until migration signoff.

## Independent backup and restoration

`npm run backup` requires a short-lived owner MFA access token. It exports entities, all revisions, links, immutable releases, jobs, GitHub snapshots, audit records, release control and all private Storage originals, including originals no longer referenced by the current draft. Every exported file has a byte count and SHA-256 checksum. Matching versioned migrations are included. Move the backup to encrypted storage independent of the VPS and Supabase.

```sh
npm run backup:verify -- --backup=<backup-directory>
```

Rehearse restoration in a separate empty development Supabase project:

1. Verify checksums and retain the backup unchanged. Apply the matching migrations. Create the target auth owner through trusted administration, keeping public signup disabled.
2. Link the CLI to the isolated target, and provide `PORTFOLIO_RESTORE_PROJECT_REF`, `PORTFOLIO_RESTORE_OWNER_UUID`, and `PORTFOLIO_RESTORE_SECRET` through a trusted temporary process environment.
3. Run `npx tsx scripts/restore.ts --backup=<backup-directory>`. The tool refuses the production project and nonempty content targets, restores revision/release relationships and counters transactionally, and uploads immutable originals without overwriting different bytes. Audit/author UUIDs are mapped to the trusted target owner.
4. Compare table, revision and original counts, render a retained snapshot, inspect representative pages and media, and enroll TOTP on the development owner to test editor access. Passwords, MFA secrets and provider credentials are intentionally not restored from a content backup.
5. Relink the CLI to the production project after the rehearsal. A real production disaster restore needs an operator-approved empty replacement project and a deliberate origin/credential cutover; the rehearsal tool refuses to overwrite production data.

The local recovery test restores actual schema, revisions and deployment generations into a new PostgreSQL engine and detects corrupted original bytes. Remote Storage/auth and the actual VPS rehearsal remain launch prerequisites.

## Owner recovery

Use the normal editor recovery email to reset a password. Password recovery does not bypass TOTP or owner RLS. Preserve an independent authenticated Supabase organization account, organization account MFA recovery codes, an authenticator backup and the protected owner UUID record. If the authenticator is lost, use trusted Supabase administration to verify identity and reset the owner’s factor, then enroll a replacement immediately. Never weaken `portfolio_is_owner`, enable anonymous access, or grant owner access by an email supplied by the browser. Review the audit trail and rotate affected sessions/secrets after recovery.

## Provider failures and repository privacy

Public Nginx delivery continues from the last activated HTML and shared assets during Supabase, GitHub or CI outages. Failed GitHub acquisition preserves each successful dataset with its own timestamp and explicit coverage. A current “most active” result is suppressed when any curated commit dataset is stale or incomplete. Failed leases are recorded rather than silently treated as zero activity.

Private/deleted/excluded repositories are removed from snapshots, source links and curation. A transaction invalidates affected rollback releases and approves a privacy replacement even if another build is pending. If provider dispatch or VPS delivery fails, the editor reports failure; retry that replacement promptly. Previously delivered pages in someone else’s browser cannot be recalled; do not promise deletion of information that was already public. No private GitHub aggregate is ever collected.

Keep machine/dispatch/deployment keys in protected CI/Edge configuration, rotate them through trusted setup, and never put them in `VITE_` variables, logs, browser storage, release snapshots or repository files. Functions accept only allowlisted origins, owner MFA or the scoped machine credential, bounded inputs and rate-limited operations.
