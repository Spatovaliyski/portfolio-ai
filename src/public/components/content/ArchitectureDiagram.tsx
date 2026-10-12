import type { ContentBlock } from '../../../domain/schema.ts';

export function ArchitectureDiagram({
  block,
}: {
  block: Extract<ContentBlock, { type: 'diagram' }>;
}) {
  return (
    <figure>
      <h2>{block.title}</h2>
      <ol className="architecture">
        {block.nodes.map((node, index) => (
          <li key={index}>{node}</li>
        ))}
      </ol>
      <figcaption>{block.explanation}</figcaption>
    </figure>
  );
}
