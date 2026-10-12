import type { PortfolioContent } from '../../../domain/schema.ts';
import { PrivacyDetails } from './components/PrivacyDetails.tsx';

export function PrivacyPage({ content }: { content: PortfolioContent }) {
  return <PrivacyDetails content={content} />;
}
