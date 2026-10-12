import { useCallback, useEffect, useRef, useState } from 'react';
import { useOwnerAuthentication } from './useOwnerAuthentication.ts';
import { uploadOriginal } from './uploadOriginal.ts';
import { invoke } from './api.ts';
import { entitySchema, type Entity, type EntityKind } from '../domain/schema.ts';
import { seedContent } from '../content/seed.ts';
import { composeRelease, validatePublication } from '../domain/publication.ts';
import { type Row, type Dashboard, rowEntity } from './model.ts';

export function useAdminWorkspace() {
  const auth = useOwnerAuthentication();
  const { aal } = auth;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard>({
    entities: [],
    releases: [],
    jobs: [],
    control: { desiredReleaseId: null, activeReleaseId: null },
    github: null,
  });
  const [section, setSection] = useState<EntityKind | 'dashboard' | 'pet-project'>('dashboard');
  const [editing, setEditing] = useState<Entity | null>(null);
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [autosave, setAutosave] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [history, setHistory] = useState<Array<{ id: string; version: number; entity: Entity }>>(
    [],
  );
  const [picked, setPicked] = useState<Record<string, Entity>>({});
  const publicationKey = useRef({ signature: '', key: '' });
  const [preview, setPreview] = useState(false);
  const [previewWidth, setPreviewWidth] = useState('100%');
  const saving = useRef(false);
  const editSerial = useRef(0);
  const [references, setReferences] = useState<string[]>([]);

  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };

    window.addEventListener('beforeunload', listener);

    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty]);

  const refresh = useCallback(async () => {
    setDashboard(await invoke<Dashboard>('content', { action: 'list' }));
  }, []);

  useEffect(() => {
    if (aal) refresh().catch((e) => setError(e.message));
  }, [aal, refresh]);

  useEffect(() => {
    setReferences([]);
    if (editing?.kind !== 'media') return;
    let disposed = false;

    invoke<{ references: Array<{ source_id: string }> }>('content', {
      action: 'references',
      entityId: editing.id,
    })
      .then((result) => {
        if (!disposed) setReferences(result.references.map((r) => r.source_id));
      })
      .catch((e) => setError(e.message));

    return () => {
      disposed = true;
    };
  }, [editing?.id, editing?.kind]);

  function change(next: Entity) {
    editSerial.current++;
    setEditing(next);
    setDirty(true);
    setError('');
    setSaveStatus('Unsaved changes');
  }

  const save = useCallback(async () => {
    if (!editing || saving.current) return;
    const serial = editSerial.current;
    const parsed = entitySchema.safeParse(editing);

    if (!parsed.success) {
      setError(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n'),
      );

      return;
    }
    saving.current = true;
    setSaveStatus('Saving…');
    try {
      const saved = await invoke<{ version: number; revisionId: string }>('content', {
        action: 'save',
        entity: parsed.data,
        expectedVersion: version,
      });

      setVersion(saved.version);
      if (serial === editSerial.current) {
        setDirty(false);
        setSaveStatus('Saved');
      } else setSaveStatus('New changes pending');
      await refresh();
    } catch (e) {
      setSaveStatus('Save failed');
      throw e;
    } finally {
      saving.current = false;
    }
  }, [editing, version, refresh]);

  useEffect(() => {
    if (!dirty || !autosave || !editing || error) return;
    const timer = setTimeout(() => {
      save().catch((error: Error) => setError(error.message));
    }, 1200);

    return () => clearTimeout(timer);
  }, [dirty, editing, autosave, error, save]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function bootstrap() {
    for (const entity of seedContent.entities) {
      const existing = dashboard.entities.find((row) => row.id === entity.id);

      if (!existing)
        await invoke('content', {
          action: 'save',
          entity: { ...entity, status: 'draft' },
          expectedVersion: 0,
        });
    }
    await refresh();
  }

  function open(row: Row) {
    if (dirty || saving.current) {
      setError('Save or discard the current changes before opening another record.');

      return;
    }
    setEditing(rowEntity(row));
    setVersion(row.version);
    setHistory([]);
    setSaveStatus('Saved');
  }

  function create(kind: EntityKind) {
    if (dirty || saving.current) {
      setError('Save or discard the current changes first.');

      return;
    }
    if (['profile', 'settings'].includes(kind) && dashboard.entities.some((e) => e.kind === kind)) {
      setError('Use the existing singleton record.');

      return;
    }
    const sample = seedContent.entities.find((e) => e.kind === kind);
    const data: Record<string, unknown> = sample
      ? structuredClone(sample.data)
      : {
          slug: 'new-note',
          title: 'New note',
          summary: '',
          publishedAt: new Date().toISOString().slice(0, 10),
          modifiedAt: new Date().toISOString().slice(0, 10),
          tags: [],
          blocks: [],
          projectIds: [],
          seo: { title: '', description: '' },
        };

    if (kind === 'media') {
      setError('Upload a private original to create a media record.');

      return;
    }
    const id = ['profile', 'settings'].includes(kind)
      ? kind
      : `${kind}-${crypto.randomUUID().slice(0, 8)}`;

    if ('slug' in data) data.slug = id;
    if ('title' in data) data.title = 'New ' + kind;
    if ('blocks' in data) data.blocks = [];
    if (kind === 'project' && section === 'pet-project') data.kind = 'pet-project';
    setEditing({ id, kind, status: 'draft', sortOrder: dashboard.entities.length, data });
    setVersion(0);
    setDirty(true);
    setHistory([]);
  }

  async function publish(action: 'publish' | 'rollback' | 'retry', releaseId?: string) {
    const signature = JSON.stringify([
      action,
      dashboard.control.desiredReleaseId,
      selected,
      releaseId,
    ]);

    if (publicationKey.current.signature !== signature)
      publicationKey.current = { signature, key: crypto.randomUUID() };
    const result = await invoke<{ state: string; error?: string }>('publication', {
      action,
      baseReleaseId: dashboard.control.desiredReleaseId,
      requestKey: publicationKey.current.key,
      revisionIds: action === 'publish' ? selected : [],
      ...(releaseId ? { releaseId } : {}),
    });

    await refresh();
    if (result.error) throw new Error(result.error);
    setSelected([]);
  }

  async function upload(file: File) {
    if (dirty || saving.current)
      throw new Error('Save or discard the current record before uploading.');

    const entity = await uploadOriginal(file);

    setEditing(entity);
    setVersion(0);
    setDirty(true);
    setSaveStatus('Original uploaded privately; save its description.');
  }

  async function loadCurrentRevision() {
    if (!editing) return;

    const latest = await invoke<Dashboard>('content', { action: 'list' });
    const row = latest.entities.find((row) => row.id === editing.id);

    if (row) {
      setEditing(rowEntity(row));
      setVersion(row.version);
      setDirty(false);
      setError('');
      setSaveStatus('Current revision loaded');
    }

    setDashboard(latest);
  }

  async function loadRevisionHistory() {
    if (!editing) return;

    const result = await invoke<{ revisions: typeof history }>('content', {
      action: 'history',
      entityId: editing.id,
    });

    setHistory(result.revisions);
  }

  async function synchronizeGitHub() {
    await invoke('content', { action: 'sync' });
    await refresh();
  }

  async function recoverAccess() {
    await auth.recoverAccess();
    setSaveStatus('If this owner account exists, a recovery email has been requested.');
  }

  function discardChanges() {
    editSerial.current++;
    setEditing(null);
    setDirty(false);
    setError('');
  }

  function chooseSection(next: typeof section) {
    if (dirty || saving.current) {
      setError('Save or discard your current changes before changing sections.');

      return;
    }

    setSection(next);
    setEditing(null);
  }

  const kind = section === 'pet-project' ? 'project' : section;
  const rows = dashboard.entities.filter(
    (row) =>
      row.kind === kind &&
      (section !== 'project' || row.data.kind !== 'pet-project') &&
      (section !== 'pet-project' || row.data.kind === 'pet-project'),
  );
  const draftEntities = dashboard.entities.map(
    (row) =>
      ({
        ...rowEntity(row),
        status: row.status === 'archived' ? 'archived' : 'published',
      }) as Entity,
  );
  let previewContent: typeof seedContent | null = null;
  let previewError = '';

  try {
    previewContent = composeRelease(
      { ...seedContent, entities: [] },
      editing
        ? [...draftEntities.filter((e) => e.id !== editing.id), { ...editing, status: 'published' }]
        : draftEntities,
      'private-preview',
      0,
      seedContent.generatedAt,
    );
    const missing = validatePublication(previewContent);

    if (missing.length) {
      previewError = missing.join('\n');
      previewContent = null;
    }
  } catch (e) {
    previewError = (e as Error).message;
  }

  const previewPath =
    editing?.kind === 'project'
      ? `/${editing.data.kind === 'pet-project' ? 'pet-projects' : 'projects'}/${editing.data.slug}/`
      : editing?.kind === 'note'
        ? `/notes/${editing.data.slug}/`
        : editing?.kind === 'page'
          ? String(editing.data.path)
          : '/';

  return {
    ...auth,
    saveStatus,
    busy,
    setPreview,
    preview,
    autosave,
    setAutosave,
    run,
    history,
    editing,
    change,
    create,
    kind,
    section,
    upload,
    rows,
    open,
    save,
    references,
    error,
    previewWidth,
    setPreviewWidth,
    previewContent,
    previewPath,
    previewError,
    dashboard,
    bootstrap,
    selected,
    setPicked,
    picked,
    setSelected,
    publish,
    loadCurrentRevision,
    loadRevisionHistory,
    synchronizeGitHub,
    recoverAccess,
    discardChanges,
    chooseSection,
  };
}

export type AdminWorkspace = ReturnType<typeof useAdminWorkspace>;
