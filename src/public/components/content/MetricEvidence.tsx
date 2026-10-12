import type { ContentBlock } from '../../../domain/schema.ts';

export function MetricEvidence({ block }: { block: Extract<ContentBlock, { type: 'metric' }> }) {
  return (
    <div className="metric">
      <strong>{block.metric.value}</strong>
      <span>{block.metric.label}</span>
      <p>
        {block.metric.period} · <a href={block.metric.sourceUrl}>Source</a> · Verified{' '}
        {block.metric.verifiedAt}
      </p>
      <small>{block.metric.note}</small>
    </div>
  );
}
