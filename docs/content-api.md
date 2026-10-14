# Content API for AI tools

Base URL: `https://spatovaliyski.com`. Local development uses `http://127.0.0.1:5173`.

Owner requests require `Authorization: Bearer <owner-access-token>` from the authenticated owner’s MFA session. Supply it through a trusted temporary process environment, such as `PORTFOLIO_OWNER_ACCESS_TOKEN`. Never paste it into chat or commit it. A publishable project key or service-role key is not an owner session.

## Read

- `GET /api/content`: the current published snapshot, with an ETag. No authentication required.
- `GET /api/admin/content`: editable records with their current versions, plus the public snapshot.
- `GET /api/admin/content/:id/history`: the item’s saved versions.

## Create, update, remove, or restore

Send `POST /api/admin/content` with `Content-Type: application/json`:

```js
{
  entity: {
    id: "experience-<uuid>",
    kind: "experience",
    status: "published",
    sortOrder: 0,
    data: {
      employer: "Company",
      role: "Senior Front-end Engineer",
      start: "2026-10-01",
      end: null,
      location: "Bulgaria",
      summary: "Responsibilities and contribution.",
      achievements: [],
      projectIds: [],
      sourceUrl: "https://spatovaliyski.com/experience/"
    }
  },
  expectedVersion: 0,
  requestKey: "<fresh uuid>"
}
```

For edits, first read the record, preserve its ID, kind, and fields, change the intended values, and send its current `version` as `expectedVersion`. For creation use zero. Set `status` to `archived` to remove an item, or back to `published` to restore it. Referenced items must remain valid. Profile, settings, and collection pages cannot be removed while required by the site.

The response contains `version`, `revisionId`, and `releaseId`. The update is live when this request succeeds. Reuse the same request key and payload after an uncertain network result. A different operation needs a new key. HTTP 409 means concurrent changes: fetch the latest record and merge the intended edit. Do not overwrite it blindly.

The shared shapes are in `src/domain/schema.ts`. Project/note text is stored in existing content sections, not a replacement page layout. Edit sections by their stable IDs and preserve gallery order, image references, and custom content. The project ID `bausy` preserves its existing phone presentation.

## Images and CV

Send raw file bytes to `POST /api/admin/media`. Set the actual MIME type as `Content-Type`, `X-File-Name` to an encodeURIComponent-encoded filename, and optionally `X-Image-Description` to an encoded description.

Supported: PNG, JPEG, WebP, AVIF, and PDF, up to 20 MiB; images are limited to 40 million pixels. The server checks file bytes, stores a private immutable original, generates responsive public derivatives, and returns the saved media `entity` and its version receipt.

Attach the returned ID to a project’s `heroMediaId`, an image/gallery section’s `mediaId`, or the profile’s `cvMediaId`, then save that record. Provide meaningful alt text for gallery sections. To replace an image, upload a new asset and swap the reference; do not overwrite file paths or manufactured media metadata.

There is no repository content file to update and no publication or build step after an API save.
