import type { PortfolioContent } from '../../../domain/schema.ts';
import { AddonList } from './components/AddonList.tsx';

export function AddonsPage({ content }: { content: PortfolioContent }) {
  return <AddonList content={content} />;
}
