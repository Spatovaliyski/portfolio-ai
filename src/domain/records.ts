import type { z } from 'zod';
import type { EntityKind, PortfolioContent, entitySchemas } from './schema.ts';

// Snapshots are validated at input/build boundaries. Rendering reads that same immutable data.
export function records<K extends EntityKind>(
  content: PortfolioContent,
  kind: K,
): Array<z.infer<(typeof entitySchemas)[K]> & { id: string }> {
  return content.entities
    .filter((entity) => entity.kind === kind && entity.status === 'published')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entity) => ({ ...entity.data, id: entity.id })) as unknown as Array<
    z.infer<(typeof entitySchemas)[K]> & { id: string }
  >;
}
