import { useId, useState } from 'react';
import Markdown from 'react-markdown';
import { PublicApp } from '../public/App.tsx';
import { composeRelease } from '../domain/publication.ts';
import type { Entity, ContentBlock } from '../domain/schema.ts';
import type { AdminWorkspace } from './useAdminWorkspace.ts';
import { editorRequest } from './api.ts';

const sections: Array<[Entity['kind'], string]> = [
  ['experience', 'Experience'],
  ['project', 'Projects'],
  ['note', 'Notes'],
  ['profile', 'Profile & CV'],
  ['qualification', 'Education & languages'],
  ['skill', 'Skills'],
  ['page', 'Site text'],
  ['media', 'Images & files'],
  ['settings', 'Site settings'],
  ['repository', 'GitHub'],
  ['redirect', 'Redirects'],
];
const name = (data: Record<string, unknown>) =>
  String(
    [
      data.title,
      data.employer,
      data.name,
      data.label,
      data.caption,
      data.alt,
      data.fullName,
      data.from,
    ].find((v) => typeof v === 'string' && v.trim()) ?? 'Untitled',
  );
const friendly = (s: string) => s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = 'text',
  required = false,
}: {
  label: string;
  value: unknown;
  onChange: (s: string) => void;
  multiline?: boolean;
  type?: string;
  required?: boolean;
}) {
  const id = useId();

  return (
    <div className="owner-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          rows={5}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
    </div>
  );
}

function TextRows({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="owner-group">
      <legend>{label}</legend>
      {values.map((v, i) => (
        <div className="owner-array" key={i}>
          <input
            aria-label={`${label} ${i + 1}`}
            value={v}
            onChange={(e) => onChange(values.map((s, n) => (n === i ? e.target.value : s)))}
          />
          <button
            type="button"
            aria-label={`Remove ${label} ${i + 1}`}
            onClick={() => onChange(values.filter((_, n) => n !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="owner-small" onClick={() => onChange([...values, ''])}>
        + Add {label.toLowerCase()}
      </button>
    </fieldset>
  );
}

function Links({
  values,
  onChange,
}: {
  values: Array<{ label: string; url: string }>;
  onChange: (v: Array<{ label: string; url: string }>) => void;
}) {
  return (
    <fieldset className="owner-group">
      <legend>Links</legend>
      {values.map((v, i) => (
        <div className="owner-link-row" key={i}>
          <Field
            label="Link text"
            value={v.label}
            onChange={(s) => onChange(values.map((x, n) => (n === i ? { ...x, label: s } : x)))}
          />
          <Field
            label="Address"
            value={v.url}
            onChange={(s) => onChange(values.map((x, n) => (n === i ? { ...x, url: s } : x)))}
          />
          <button
            type="button"
            aria-label={`Remove link ${i + 1}`}
            onClick={() => onChange(values.filter((_, n) => n !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, { label: '', url: 'https://' }])}>
        + Add link
      </button>
    </fieldset>
  );
}

function MarkdownField({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="owner-markdown">
      <div className="owner-markdown-top">
        <span>Description · Markdown</span>
        <button type="button" onClick={() => setPreview(!preview)}>
          {preview ? 'Edit text' : 'Preview formatting'}
        </button>
      </div>
      {preview ? (
        <div className="owner-markdown-preview">
          <Markdown skipHtml>{value || 'Nothing written yet.'}</Markdown>
        </div>
      ) : (
        <textarea
          aria-label="Description Markdown"
          rows={9}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <small>Headings, lists, **bold**, and links. Images use the image picker.</small>
    </div>
  );
}

function MediaPicker({
  workspace: w,
  label,
  value,
  onChange,
  pdf = false,
}: {
  workspace: AdminWorkspace;
  label: string;
  value: unknown;
  onChange: (id: string | null) => void;
  pdf?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const media = [
    ...w.rows
      .filter((r) => r.kind === 'media' && r.status !== 'archived')
      .map((r) => ({ id: r.id, data: r.data })),
  ];
  const selected = media.find((m) => m.id === value);

  return (
    <fieldset className="owner-group">
      <legend>{label}</legend>
      <div className="owner-media-current">
        {selected &&
          (selected.data.mime === 'application/pdf' ? (
            <span>PDF</span>
          ) : (
            <img src={String(selected.data.publicPath)} alt={String(selected.data.alt ?? '')} />
          ))}
        <div>
          <strong>{selected ? name(selected.data) : 'No file selected'}</strong>
          <button type="button" onClick={() => setOpen(!open)}>
            {selected ? 'Replace file' : 'Choose file'}
          </button>
          {selected && (
            <button type="button" onClick={() => onChange(null)}>
              Remove selection
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="owner-picker">
          <input
            aria-label="Find an image"
            placeholder="Find a file…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="owner-upload">
            Upload {pdf ? 'PDF' : 'image'}
            <input
              type="file"
              accept={pdf ? 'application/pdf' : 'image/png,image/jpeg,image/webp,image/avif'}
              disabled={w.busy}
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file)
                  w.run(async () => {
                    const uploaded = await w.upload(file, String(selected?.data.alt ?? ''));

                    onChange(uploaded.entity.id);
                    setOpen(false);
                  });
              }}
            />
          </label>
          <div className="owner-media-grid">
            {media
              .filter(
                (m) =>
                  (pdf ? m.data.mime === 'application/pdf' : m.data.mime !== 'application/pdf') &&
                  name(m.data).toLowerCase().includes(search.toLowerCase()),
              )
              .map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                >
                  {pdf ? <span>PDF</span> : <img src={String(m.data.publicPath)} alt="" />}
                  <span>{name(m.data)}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </fieldset>
  );
}

function References({
  workspace: w,
  values,
  onChange,
  kind = 'project',
  label = 'Related projects',
}: {
  workspace: AdminWorkspace;
  values: string[];
  onChange: (v: string[]) => void;
  kind?: Entity['kind'];
  label?: string;
}) {
  const rows = w.rows.filter((r) => r.kind === kind && r.status !== 'archived');
  const selectedCount = rows.filter((r) => values.includes(r.id)).length;

  return (
    <details className="owner-references">
      <summary>
        {label}
        {selectedCount > 0 && ` (${selectedCount} selected)`}
      </summary>
      <fieldset className="owner-group">
        <legend>{label}</legend>
        {rows.map((r) => (
          <label className="owner-check" key={r.id}>
            <input
              type="checkbox"
              checked={values.includes(r.id)}
              onChange={(e) =>
                onChange(e.target.checked ? [...values, r.id] : values.filter((id) => id !== r.id))
              }
            />
            {name(r.data)}
          </label>
        ))}
      </fieldset>
    </details>
  );
}

function ContentSections({
  workspace: w,
  blocks,
  onChange,
}: {
  workspace: AdminWorkspace;
  blocks: ContentBlock[];
  onChange: (b: ContentBlock[]) => void;
}) {
  function set(index: number, key: string, value: unknown) {
    onChange(blocks.map((b, i) => (i === index ? ({ ...b, [key]: value } as ContentBlock) : b)));
  }

  return (
    <div className="owner-sections">
      {blocks.map((block, index) => (
        <section className="owner-content-section" key={block.id}>
          <div className="owner-section-heading">
            <h3>{block.type === 'prose' ? 'Text' : friendly(block.type)}</h3>
            <div>
              <button
                type="button"
                disabled={index === 0}
                aria-label={`Move section ${index + 1} up`}
                onClick={() => {
                  const next = [...blocks];

                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  onChange(next);
                }}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === blocks.length - 1}
                aria-label={`Move section ${index + 1} down`}
                onClick={() => {
                  const next = [...blocks];

                  [next[index + 1], next[index]] = [next[index], next[index + 1]];
                  onChange(next);
                }}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`Remove section ${index + 1}`}
                onClick={() => onChange(blocks.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </div>
          </div>
          {block.type === 'prose' && (
            <MarkdownField value={block.markdown} onChange={(v) => set(index, 'markdown', v)} />
          )}
          {block.type === 'heading' && (
            <Field label="Heading" value={block.text} onChange={(v) => set(index, 'text', v)} />
          )}
          {block.type === 'image' && (
            <>
              <MediaPicker
                workspace={w}
                label="Image"
                value={block.mediaId}
                onChange={(v) => set(index, 'mediaId', v ?? '')}
              />
              <Field
                label="Image description"
                value={block.alt}
                onChange={(v) => set(index, 'alt', v)}
              />
              <Field
                label="Caption"
                value={block.caption}
                onChange={(v) => set(index, 'caption', v)}
              />
            </>
          )}
          {block.type === 'gallery' && (
            <>
              {block.images.map((image, i) => (
                <div key={i}>
                  <MediaPicker
                    workspace={w}
                    label={`Image ${i + 1}`}
                    value={image.mediaId}
                    onChange={(v) =>
                      set(
                        index,
                        'images',
                        block.images.map((x, n) => (n === i ? { ...x, mediaId: v ?? '' } : x)),
                      )
                    }
                  />
                  <Field
                    label="Image description"
                    value={image.alt}
                    onChange={(v) =>
                      set(
                        index,
                        'images',
                        block.images.map((x, n) => (n === i ? { ...x, alt: v } : x)),
                      )
                    }
                  />
                  <Field
                    label="Caption"
                    value={image.caption}
                    onChange={(v) =>
                      set(
                        index,
                        'images',
                        block.images.map((x, n) => (n === i ? { ...x, caption: v } : x)),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        index,
                        'images',
                        block.images.filter((_, n) => n !== i),
                      )
                    }
                  >
                    Remove image
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={block.images.length >= 12}
                onClick={() =>
                  set(index, 'images', [...block.images, { mediaId: '', alt: '', caption: '' }])
                }
              >
                + Add image
              </button>
            </>
          )}
          {block.type === 'links' && (
            <Links values={block.links} onChange={(v) => set(index, 'links', v)} />
          )}
          {block.type === 'related' && (
            <References
              workspace={w}
              values={block.projectIds}
              onChange={(v) => set(index, 'projectIds', v)}
            />
          )}
          {block.type === 'diagram' && (
            <>
              <Field label="Title" value={block.title} onChange={(v) => set(index, 'title', v)} />
              <TextRows
                label="Steps"
                values={block.nodes}
                onChange={(v) => set(index, 'nodes', v)}
              />
              <Field
                label="Explanation"
                multiline
                value={block.explanation}
                onChange={(v) => set(index, 'explanation', v)}
              />
            </>
          )}
          {(['summary', 'decision', 'code'] as string[]).includes(block.type) &&
            (block.type === 'summary'
              ? ['title', 'ownership', 'constraints']
              : block.type === 'decision'
                ? ['title', 'context', 'choice', 'alternatives', 'consequence']
                : ['language', 'code', 'caption']
            ).map((key) => (
              <Field
                key={key}
                label={friendly(key)}
                multiline={key !== 'title' && key !== 'language'}
                value={(block as unknown as Record<string, unknown>)[key]}
                onChange={(v) => set(index, key, v)}
              />
            ))}
          {block.type === 'metric' &&
            ['label', 'value', 'period', 'sourceUrl', 'verifiedAt', 'note'].map((key) => (
              <Field
                key={key}
                label={friendly(key)}
                value={(block.metric as Record<string, unknown>)[key]}
                type={key === 'verifiedAt' ? 'date' : 'text'}
                onChange={(v) => set(index, 'metric', { ...block.metric, [key]: v })}
              />
            ))}
        </section>
      ))}
      <button
        type="button"
        className="owner-add-text"
        onClick={() =>
          onChange([...blocks, { id: crypto.randomUUID(), type: 'prose', markdown: '' }])
        }
      >
        + Add text section
      </button>
    </div>
  );
}

function ItemFields({ workspace: w, item }: { workspace: AdminWorkspace; item: Entity }) {
  const d = item.data;
  const set = (key: string, value: unknown) => w.change({ ...item, data: { ...d, [key]: value } });
  const text = (key: string, label: string, multiline = false, type = 'text', required = false) => (
    <Field
      key={key}
      label={label}
      value={d[key]}
      multiline={multiline}
      type={type}
      required={required}
      onChange={(v) => set(key, v)}
    />
  );
  const links = () => (
    <Links
      values={(d.links ?? []) as Array<{ label: string; url: string }>}
      onChange={(v) => set('links', v)}
    />
  );

  return (
    <>
      {item.kind === 'experience' && (
        <>
          {text('employer', 'Company', false, 'text', true)}
          {text('role', 'Role', false, 'text', true)}
          <div className="owner-two">
            <Field
              label="Started"
              type="month"
              value={String(d.start).slice(0, 7)}
              onChange={(v) => set('start', v ? v + '-01' : '')}
              required
            />
            <Field
              label="Ended"
              type="month"
              value={d.end ? String(d.end).slice(0, 7) : ''}
              onChange={(v) => set('end', v ? v + '-01' : null)}
            />
          </div>
          <label className="owner-check">
            <input
              type="checkbox"
              checked={d.end === null}
              onChange={(e) =>
                set('end', e.target.checked ? null : new Date().toISOString().slice(0, 10))
              }
            />
            I currently work here
          </label>
          {text('location', 'Location')}
          {text('summary', 'Description', true)}
          <TextRows
            label="Achievements"
            values={d.achievements as string[]}
            onChange={(v) => set('achievements', v)}
          />
          <References
            workspace={w}
            values={d.projectIds as string[]}
            onChange={(v) => set('projectIds', v)}
          />
        </>
      )}
      {item.kind === 'project' && (
        <>
          {text('title', 'Project name', false, 'text', true)}
          {text('summary', 'Short description', true)}
          {text('ownership', 'My contribution', true)}
          {text('dates', 'Dates or availability')}
          <div className="owner-two">
            <label className="owner-field">
              Project type
              <select value={String(d.kind)} onChange={(e) => set('kind', e.target.value)}>
                <option value="professional">Professional work</option>
                <option value="product">Product</option>
                <option value="pet-project">Pet project</option>
                <option value="archive">Archive</option>
              </select>
            </label>
            <label className="owner-field">
              Status
              <select value={String(d.status)} onChange={(e) => set('status', e.target.value)}>
                {['active', 'maintained', 'completed', 'experimental', 'archived'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="owner-check">
            <input
              type="checkbox"
              checked={Boolean(d.featured)}
              onChange={(e) => set('featured', e.target.checked)}
            />
            Feature this project
          </label>
          <MediaPicker
            workspace={w}
            label="Main image"
            value={d.heroMediaId}
            onChange={(v) => set('heroMediaId', v)}
          />
          <TextRows
            label="Technologies"
            values={d.technologies as string[]}
            onChange={(v) => set('technologies', v)}
          />
          {links()}
        </>
      )}
      {item.kind === 'note' && (
        <>
          {text('title', 'Title', false, 'text', true)}
          {text('summary', 'Short description', true)}
          <TextRows label="Tags" values={d.tags as string[]} onChange={(v) => set('tags', v)} />
        </>
      )}
      {item.kind === 'profile' && (
        <>
          {text('name', 'Name')}
          {text('role', 'Headline')}
          {text('positioning', 'Introduction', true)}
          {text('biography', 'About me', true)}
          {text('location', 'Location')}
          {text('email', 'Email', false, 'email')}
          <label className="owner-check">
            <input
              type="checkbox"
              checked={Boolean(d.availability)}
              onChange={(e) => set('availability', e.target.checked)}
            />
            Available for new work
          </label>
          {text('availabilityLabel', 'Availability message')}
          {links()}
          <MediaPicker
            workspace={w}
            label="PDF CV"
            value={d.cvMediaId}
            onChange={(v) => set('cvMediaId', v)}
            pdf
          />
        </>
      )}
      {item.kind === 'qualification' && (
        <>
          {text('title', 'Qualification')}
          {text('institution', 'Institution')}
          {text('dates', 'Dates')}
          {text('details', 'Description', true)}
          <label className="owner-field">
            Type
            <select value={String(d.kind)} onChange={(e) => set('kind', e.target.value)}>
              {['education', 'language', 'credential'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </>
      )}
      {item.kind === 'skill' && (
        <>
          {text('label', 'Skill')}
          {text('category', 'Category')}
          <References
            workspace={w}
            label="Work demonstrating this skill"
            kind="experience"
            values={d.evidenceIds as string[]}
            onChange={(v) => set('evidenceIds', v)}
          />
          <References
            workspace={w}
            label="Projects demonstrating this skill"
            values={d.evidenceIds as string[]}
            onChange={(v) => set('evidenceIds', v)}
          />
        </>
      )}
      {item.kind === 'page' && (
        <>
          {text('eyebrow', 'Section label')}
          {text('title', 'Headline')}
          {text('introduction', 'Introduction', true)}
        </>
      )}
      {item.kind === 'media' && (
        <>
          <div className="owner-media-large">
            {d.mime === 'application/pdf' ? (
              <a href={String(d.publicPath)} target="_blank" rel="noreferrer">
                Open PDF
              </a>
            ) : (
              <img src={String(d.publicPath)} alt={String(d.alt)} />
            )}
          </div>
          {text('caption', 'File name or caption')}
          {text('alt', 'Image description', true)}
        </>
      )}
      {item.kind === 'settings' && (
        <>
          {text('siteTitle', 'Site title')}
          {text('footer', 'Footer')}
          {text('defaultDescription', 'Site description', true)}
          <details>
            <summary>Interface wording</summary>
            {Object.entries(d.labels as Record<string, string>).map(([key, value]) => (
              <Field
                key={key}
                label={friendly(key)}
                value={value}
                onChange={(v) =>
                  set('labels', { ...(d.labels as Record<string, string>), [key]: v })
                }
              />
            ))}
          </details>
        </>
      )}
      {item.kind === 'repository' && (
        <>
          {text('fullName', 'Repository')}
          {text('description', 'Description', true)}
          <label className="owner-check">
            <input
              type="checkbox"
              checked={Boolean(d.featured)}
              onChange={(e) => set('featured', e.target.checked)}
            />
            Featured repository
          </label>
        </>
      )}
      {item.kind === 'redirect' && (
        <>
          {text('from', 'Old address')}
          {text('to', 'Destination')}
          {text('reason', 'Description')}
        </>
      )}
      {Array.isArray(d.blocks) && (
        <ContentSections
          workspace={w}
          blocks={d.blocks as ContentBlock[]}
          onChange={(v) => set('blocks', v)}
        />
      )}
      <details className="owner-advanced">
        <summary>More options</summary>
        <Field
          label="Position in list"
          type="number"
          value={item.sortOrder}
          onChange={(v) => w.change({ ...item, sortOrder: Number(v) })}
        />
        {'slug' in d && text('slug', 'Page address')}
        {'sourceUrl' in d && (
          <Field
            label="Source link"
            value={d.sourceUrl}
            onChange={(v) =>
              set(
                'sourceUrl',
                v || (item.kind === 'experience' ? 'https://spatovaliyski.com/experience/' : null),
              )
            }
          />
        )}
        {'seo' in d && (
          <>
            <Field
              label="Search title"
              value={(d.seo as Record<string, unknown>).title}
              onChange={(v) => set('seo', { ...(d.seo as Record<string, unknown>), title: v })}
            />
            <Field
              label="Search description"
              multiline
              value={(d.seo as Record<string, unknown>).description}
              onChange={(v) =>
                set('seo', { ...(d.seo as Record<string, unknown>), description: v })
              }
            />
          </>
        )}
      </details>
    </>
  );
}

function newItem(kind: Entity['kind']): Entity {
  const id = `${kind}-${crypto.randomUUID()}`;
  const date = new Date().toISOString().slice(0, 10);
  const seo = { title: 'New entry', description: 'New portfolio entry.' };
  const data: Record<string, unknown> =
    kind === 'experience'
      ? {
          employer: '',
          role: '',
          start: date,
          end: null,
          location: '',
          summary: '',
          achievements: [],
          projectIds: [],
          sourceUrl: 'https://spatovaliyski.com/experience/',
        }
      : kind === 'project'
        ? {
            slug: id,
            title: '',
            kind: 'professional',
            status: 'active',
            summary: '',
            ownership: '',
            dates: '',
            technologies: [],
            links: [],
            blocks: [],
            heroMediaId: null,
            repositoryIds: [],
            featured: false,
            seo,
          }
        : kind === 'note'
          ? {
              slug: id,
              title: '',
              summary: '',
              publishedAt: date,
              modifiedAt: date,
              tags: [],
              blocks: [{ id: crypto.randomUUID(), type: 'prose', markdown: '' }],
              projectIds: [],
              seo,
            }
          : kind === 'qualification'
            ? {
                kind: 'education',
                title: '',
                institution: '',
                dates: '',
                details: '',
                sourceUrl: null,
              }
            : kind === 'skill'
              ? { label: '', category: '', evidenceIds: [] }
              : kind === 'redirect'
                ? { from: '/', to: '/', status: 301, reason: '' }
                : {
                    githubId: 1,
                    fullName: 'Spatovaliyski/',
                    featured: false,
                    projectId: null,
                    description: '',
                  };

  return { id, kind, status: 'published', sortOrder: 0, data };
}

export function OwnerEditor({ workspace: w }: { workspace: AdminWorkspace }) {
  const [search, setSearch] = useState('');
  const [showRemoved, setShowRemoved] = useState(false);
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; entity: Entity; created_at: string }>>(
    [],
  );
  const item = w.editing;
  const rows = w.rows.filter(
    (r) =>
      r.kind === w.section &&
      (showRemoved || r.status !== 'archived') &&
      name(r.data).toLowerCase().includes(search.toLowerCase()),
  );
  const title = sections.find(([kind]) => kind === w.section)?.[1];
  const previewPath =
    item?.kind === 'project'
      ? `/${item.data.kind === 'pet-project' ? 'pet-projects' : 'projects'}/${item.data.slug}/`
      : item?.kind === 'note'
        ? `/notes/${item.data.slug}/`
        : item?.kind === 'experience' || item?.kind === 'qualification' || item?.kind === 'skill'
          ? '/experience/'
          : item?.kind === 'page'
            ? String(item.data.path)
            : item?.kind === 'profile'
              ? '/about/'
              : '/';
  let previewContent = null;

  try {
    previewContent =
      w.content && item
        ? composeRelease(
            w.content,
            [
              ...w.rows
                .filter((r) => r.kind === 'media' && r.status === 'published')
                .map((r) => ({
                  id: r.id,
                  kind: r.kind,
                  status: r.status,
                  sortOrder: r.sort_order,
                  data: r.data,
                })),
              item,
            ],
            'preview',
            0,
            new Date().toISOString(),
          )
        : null;
  } catch {
    /* An incomplete new form can be edited before it is valid for preview. */
  }

  return (
    <div className="owner-app">
      <aside className="owner-nav">
        <a className="owner-brand" href="/">
          ms<span>.</span> <small>Content</small>
        </a>
        <nav aria-label="Content sections">
          {sections.map(([kind, label]) => (
            <button
              key={kind}
              className={kind === w.section ? 'active' : ''}
              onClick={() => {
                w.chooseSection(kind);
                setSearch('');
                setHistory([]);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <a href="/" target="_blank" rel="noreferrer">
          View website ↗
        </a>
        <button onClick={() => w.run(w.signOut)}>Sign out</button>
      </aside>
      <main className="owner-main">
        <header className="owner-heading">
          <div>
            <span className="eyebrow">Your portfolio</span>
            <h1>{title}</h1>
            <p>Make a quick change. Save it straight to your website.</p>
          </div>
          {!['profile', 'settings', 'page', 'media'].includes(w.section) && (
            <button className="owner-primary" onClick={() => w.create(newItem(w.section))}>
              + Add {w.section === 'qualification' ? 'qualification' : w.section}
            </button>
          )}
          {w.section === 'media' && (
            <label className="owner-upload">
              + Upload file
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif,application/pdf"
                disabled={w.busy || w.dirty}
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (file) w.run(() => w.uploadAndOpen(file));
                }}
              />
            </label>
          )}
        </header>
        <div className="owner-workspace">
          <section className="owner-list" aria-label="Content items">
            <input
              aria-label="Search content"
              placeholder="Find an item…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div>
              {rows.map((row) => (
                <button
                  key={row.id}
                  className={item?.id === row.id ? 'selected' : ''}
                  onClick={() => {
                    w.open(row);
                    setHistory([]);
                  }}
                >
                  <strong>{name(row.data)}</strong>
                  <small>
                    {String(row.data.role ?? row.data.summary ?? row.data.institution ?? '').slice(
                      0,
                      90,
                    )}
                  </small>
                </button>
              ))}
            </div>
            <label className="owner-check">
              <input
                type="checkbox"
                checked={showRemoved}
                onChange={(e) => setShowRemoved(e.target.checked)}
              />
              Show removed items
            </label>
            {!rows.length && <p>No matching items.</p>}
          </section>
          <section className="owner-edit-area">
            {w.error && (
              <div className="owner-error" role="alert">
                <p>{w.error}</p>
                {/newer|conflict/i.test(w.error) && (
                  <button onClick={() => w.run(w.reload)}>Discard edits and load latest</button>
                )}
              </div>
            )}
            {item ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  w.run(() => w.save());
                }}
              >
                <div className="owner-savebar">
                  <div>
                    <strong>{name(item.data)}</strong>
                    <span role="status">{w.saveStatus || 'Up to date'}</span>
                  </div>
                  <button type="button" disabled={w.busy} onClick={() => setPreview(!preview)}>
                    {preview ? 'Close preview' : 'Preview'}
                  </button>
                  <button type="submit" className="owner-primary" disabled={w.busy || !w.dirty}>
                    {w.busy ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
                <fieldset className="owner-fields" disabled={w.busy}>
                  <ItemFields workspace={w} item={item} />
                </fieldset>
                <div className="owner-footer">
                  <button type="button" disabled={w.busy} onClick={w.discardChanges}>
                    Discard changes
                  </button>
                  {w.version > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        w.run(async () => {
                          const data = await editorRequest<{ revisions: typeof history }>(
                            `content/${item.id}/history`,
                          );

                          setHistory(data.revisions);
                        })
                      }
                    >
                      Recent saves
                    </button>
                  )}
                  {item.status === 'archived' && (
                    <button
                      type="button"
                      onClick={() => w.run(() => w.save({ ...item, status: 'published' }))}
                    >
                      Restore to website
                    </button>
                  )}
                  {!['profile', 'settings', 'page'].includes(item.kind) &&
                    item.status !== 'archived' &&
                    w.version > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              'Remove this item from your website? You can restore it from removed items.',
                            )
                          )
                            w.run(() => w.save({ ...item, status: 'archived' }));
                        }}
                      >
                        Remove from website
                      </button>
                    )}
                </div>
                {history.length > 0 && (
                  <div className="owner-history">
                    {history.map((h) => (
                      <div key={h.id}>
                        <span>{new Date(h.created_at).toLocaleString()}</span>
                        <button type="button" onClick={() => w.loadRevision(h.entity)}>
                          Load this version
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            ) : (
              <div className="owner-empty">
                <span>✎</span>
                <h2>Choose an item to edit</h2>
                <p>Your content lives in Supabase. Text, dates, and images update when you save.</p>
              </div>
            )}
          </section>
        </div>
        {preview && previewContent && (
          <section className="owner-preview" aria-label="Website preview">
            <header>
              <strong>Website preview</strong>
              <button onClick={() => setPreview(false)}>Close preview</button>
            </header>
            <PublicApp content={previewContent} path={previewPath} />
          </section>
        )}
      </main>
    </div>
  );
}
