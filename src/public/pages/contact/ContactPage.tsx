import type { PortfolioContent } from '../../../domain/schema.ts';
import { ContactDetails } from './components/ContactDetails.tsx';

export function ContactPage({ content }: { content: PortfolioContent }) {
  return <ContactDetails content={content} />;
}
