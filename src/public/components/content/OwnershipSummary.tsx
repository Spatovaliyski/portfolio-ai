import type { ContentBlock } from '../../../domain/schema.ts';

export function OwnershipSummary({ block }: { block: Extract<ContentBlock, { type: 'summary' }> }) {
  return (
    <aside className="ownership-panel">
      <h2>{block.title}</h2>
      <p>{block.ownership}</p>
      <p>{block.constraints}</p>
    </aside>
  );
}
