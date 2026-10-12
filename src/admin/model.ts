import type { Entity, EntityKind } from '../domain/schema.ts';

export type Row = {
  id: string;
  kind: EntityKind;
  status: Entity['status'];
  sort_order: number;
  data: Record<string, unknown>;
  version: number;
  current_revision: string;
};

export type Release = {
  id: string;
  generation: number;
  state: string;
  failure: string | null;
  revision_manifest: Record<string, string>;
  deployed_at: string | null;
};

export type Dashboard = {
  entities: Row[];
  releases: Release[];
  jobs: Array<{ id: string; state: string; kind: string; error: string | null }>;
  control: { desiredReleaseId: string | null; activeReleaseId: string | null };
  github: { created_at: string } | null;
};

export const rowEntity = (row: Row): Entity => ({
  id: row.id,
  kind: row.kind,
  status: row.status,
  sortOrder: row.sort_order,
  data: row.data,
});

export const sections: Array<[string, EntityKind | 'dashboard' | 'pet-project']> = [
  ['Dashboard', 'dashboard'],
  ['Profile', 'profile'],
  ['Pages', 'page'],
  ['Projects', 'project'],
  ['Pet projects', 'pet-project'],
  ['Experience', 'experience'],
  ['Qualifications', 'qualification'],
  ['Skills', 'skill'],
  ['Notes', 'note'],
  ['Media', 'media'],
  ['GitHub', 'repository'],
  ['Settings', 'settings'],
  ['Redirects', 'redirect'],
];
