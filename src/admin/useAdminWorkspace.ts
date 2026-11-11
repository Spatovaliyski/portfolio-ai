import { useCallback, useEffect, useRef, useState } from 'react';
import { ZodError } from 'zod';
import { useOwnerAuthentication } from './useOwnerAuthentication.ts';
import { editorRequest } from './api.ts';
import { entitySchema, type Entity, type PortfolioContent } from '../domain/schema.ts';
import type { ContentRow } from '../server/store.ts';

export function useAdminWorkspace() {
  const auth = useOwnerAuthentication();
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [content, setContent] = useState<PortfolioContent | null>(null);
  const [editing, setEditing] = useState<Entity | null>(null);
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [section, setSection] = useState<Entity['kind']>('experience');
  const serial = useRef(0);
  const pending = useRef(false);
  const request = useRef({ signature: '', key: '' });
  const refresh = useCallback(async () => {
    const data = await editorRequest<{ entities: ContentRow[]; content: PortfolioContent }>(
      'content',
    );

    setRows(data.entities);
    setContent(data.content);

    return data;
  }, []);

  useEffect(() => {
    if (auth.aal) refresh().catch((e) => setError(e.message));
  }, [auth.aal, refresh]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };

    window.addEventListener('beforeunload', guard);

    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  async function run(action: () => Promise<unknown>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof ZodError
          ? e.issues
              .map((issue) => {
                const field = issue.path
                  .filter((part) => part !== 'data')
                  .map((part) =>
                    typeof part === 'number'
                      ? String(part + 1)
                      : String(part).replace(/([A-Z])/g, ' $1'),
                  )
                  .join(' › ');

                return `${field ? field + ': ' : ''}${issue.message}`;
              })
              .join('\n')
          : (e as Error).message,
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function change(next: Entity) {
    serial.current++;
    setEditing(next);
    setDirty(true);
    setError('');
    setSaveStatus('Unsaved changes');
  }

  function open(row: ContentRow) {
    if (dirty || pending.current) {
      setError('Save or discard your changes before opening another item.');

      return;
    }
    setEditing({
      id: row.id,
      kind: row.kind,
      status: row.status,
      sortOrder: row.sort_order,
      data: structuredClone(row.data),
    });
    setVersion(row.version);
    setSaveStatus('');
  }

  function chooseSection(next: Entity['kind']) {
    if (dirty || pending.current) {
      setError('Save or discard your changes first.');

      return;
    }
    setSection(next);
    setEditing(null);
    setError('');
  }

  async function save(override?: Entity) {
    const item = override ?? editing;

    if (!item) return;
    const captured = serial.current;
    const entity = entitySchema.parse({
      ...item,
      status: item.status === 'archived' ? 'archived' : 'published',
    });
    const signature = JSON.stringify([entity, version]);

    if (request.current.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    setSaveStatus('Saving…');
    try {
      const result = await editorRequest<{ version: number }>('content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, expectedVersion: version, requestKey: request.current.key }),
      });

      setVersion(result.version);
      if (captured === serial.current) {
        setDirty(false);
        setEditing(entity);
        setSaveStatus('Saved and live');
      } else setSaveStatus('Saved; newer edits are unsaved');
      // The write is already committed. A refresh failure must not misreport a successful save.
      try {
        await refresh();
      } catch {
        setError(
          'Saved and live. The list could not refresh; reload when your connection returns.',
        );
      }
    } catch (e) {
      setSaveStatus('Save failed - your edits are still here');
      throw e;
    }
  }

  function discardChanges() {
    serial.current++;
    setDirty(false);
    setEditing(null);
    setError('');
    setSaveStatus('');
  }

  function loadRevision(entity: Entity) {
    if (!editing || editing.id !== entity.id || editing.kind !== entity.kind) return;
    // Earlier media revisions may predate Storage migration. Restore descriptions,
    // retaining the immutable file metadata of the current asset.
    change({
      ...entity,
      status: 'published',
      data:
        editing.kind === 'media'
          ? {
              ...editing.data,
              alt: entity.data.alt,
              caption: entity.data.caption,
              sourceUrl: entity.data.sourceUrl,
              rights: entity.data.rights,
            }
          : entity.data,
    });
  }

  async function reload() {
    const data = await refresh();
    const row = data.entities.find((r) => r.id === editing?.id);

    if (row) {
      setDirty(false);
      setEditing({
        id: row.id,
        kind: row.kind,
        status: row.status,
        sortOrder: row.sort_order,
        data: row.data,
      });
      setVersion(row.version);
      setError('');
      setSaveStatus('Latest saved content loaded');
    }
  }

  async function upload(file: File, alt = '') {
    const result = await editorRequest<{ entity: Entity; version: number; revisionId: string }>(
      'media',
      {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-File-Name': encodeURIComponent(file.name),
          'X-Image-Description': encodeURIComponent(alt),
        },
        body: file,
      },
    );

    setRows((current) => [
      ...current.filter((row) => row.id !== result.entity.id),
      {
        id: result.entity.id,
        kind: 'media',
        status: 'published',
        sort_order: 0,
        data: result.entity.data,
        version: result.version,
        current_revision: result.revisionId,
      },
    ]);
    try {
      await refresh();
    } catch {
      /* The uploaded file is already available in the local picker. */
    }

    return result;
  }

  async function uploadAndOpen(file: File) {
    if (dirty) throw new Error('Save or discard your current changes before uploading a new file.');
    const result = await upload(file);

    setEditing(result.entity);
    setVersion(result.version);
    setDirty(false);
    setSaveStatus('Uploaded to your media library');
  }

  function create(entity: Entity) {
    if (dirty || pending.current) {
      setError('Save or discard your changes first.');

      return;
    }
    setVersion(0);
    change(entity);
  }

  async function recoverAccess() {
    await auth.recoverAccess();
    setSaveStatus('Recovery email requested.');
  }

  return {
    ...auth,
    recoverAccess,
    rows,
    content,
    editing,
    version,
    dirty,
    busy,
    error,
    saveStatus,
    section,
    chooseSection,
    open,
    change,
    create,
    run,
    save,
    refresh,
    reload,
    upload,
    uploadAndOpen,
    discardChanges,
    loadRevision,
  };
}

export type AdminWorkspace = ReturnType<typeof useAdminWorkspace>;
