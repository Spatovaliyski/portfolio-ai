import type { ContentBlock } from '../../../domain/schema.ts';

export function EngineeringDecision({
  block,
}: {
  block: Extract<ContentBlock, { type: 'decision' }>;
}) {
  return (
    <div className="decision">
      <span className="eyebrow">Engineering decision</span>
      <h2>{block.title}</h2>
      <p>{block.context}</p>
      <dl>
        <dt>Chosen approach</dt>
        <dd>{block.choice}</dd>
        <dt>Alternatives</dt>
        <dd>{block.alternatives}</dd>
        <dt>Tradeoff</dt>
        <dd>{block.consequence}</dd>
      </dl>
    </div>
  );
}
