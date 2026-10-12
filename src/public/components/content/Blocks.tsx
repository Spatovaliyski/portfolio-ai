import Markdown from 'react-markdown';
import type { ContentBlock, PortfolioContent } from '../../../domain/schema.ts';
import { Screenshots } from '../media/Screenshots.tsx';
import { OwnershipSummary } from './OwnershipSummary.tsx';
import { EngineeringDecision } from './EngineeringDecision.tsx';
import { CodeSample } from './CodeSample.tsx';
import { ArchitectureDiagram } from './ArchitectureDiagram.tsx';
import { MetricEvidence } from './MetricEvidence.tsx';
import { ReferenceLinks, RelatedProjects } from './ReferenceLinks.tsx';

function BlockContent({ block, content }: { block: ContentBlock; content: PortfolioContent }) {
  switch (block.type) {
    case 'prose':
      return <Markdown skipHtml>{block.markdown}</Markdown>;
    case 'heading':
      return <h2>{block.text}</h2>;
    case 'image':
      return <Screenshots images={[block]} content={content} />;
    case 'gallery':
      return <Screenshots images={block.images} content={content} />;
    case 'summary':
      return <OwnershipSummary block={block} />;
    case 'decision':
      return <EngineeringDecision block={block} />;
    case 'code':
      return <CodeSample block={block} />;
    case 'diagram':
      return <ArchitectureDiagram block={block} />;
    case 'links':
      return <ReferenceLinks block={block} />;
    case 'related':
      return <RelatedProjects block={block} content={content} />;
    case 'metric':
      return <MetricEvidence block={block} />;
  }
}

export function Blocks({ blocks, content }: { blocks: ContentBlock[]; content: PortfolioContent }) {
  return (
    <div className="blocks">
      {blocks.map((block) => (
        <section key={block.id} className={`block block-${block.type}`}>
          <BlockContent block={block} content={content} />
        </section>
      ))}
    </div>
  );
}
