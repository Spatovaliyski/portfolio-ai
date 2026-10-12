import type { ContentBlock } from '../../../domain/schema.ts';

export function CodeSample({ block }: { block: Extract<ContentBlock, { type: 'code' }> }) {
  return (
    <figure>
      <pre>
        <code>{block.code}</code>
      </pre>
      <figcaption>
        {block.caption}
        {block.language && ` · ${block.language}`}
      </figcaption>
    </figure>
  );
}
