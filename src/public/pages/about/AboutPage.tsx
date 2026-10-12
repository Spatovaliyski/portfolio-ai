import type { PortfolioContent } from '../../../domain/schema.ts';
import { Biography } from './components/Biography.tsx';

export function AboutPage({ content }: { content: PortfolioContent }) {
  return <Biography content={content} />;
}
