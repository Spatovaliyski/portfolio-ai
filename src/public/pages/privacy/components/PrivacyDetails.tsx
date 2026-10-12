import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { Blocks } from '../../../components/content/Blocks.tsx';

export function PrivacyDetails({ content }: { content: PortfolioContent }) {
  const page = records(content, 'page').find((page) => page.path === '/privacy/');

  return <Blocks content={content} blocks={page?.blocks ?? []} />;
}
