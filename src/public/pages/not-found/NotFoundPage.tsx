import type { PortfolioContent } from '../../../domain/schema.ts';
import { records } from '../../../domain/records.ts';
import { PageLayout } from '../../components/ui/PageLayout.tsx';
import { ReturnHome } from './components/ReturnHome.tsx';

export function NotFoundPage({ content }: { content: PortfolioContent }) {
  const labels = records(content, 'settings')[0].labels;

  return (
    <PageLayout
      eyebrow="404 / Not found"
      title="A different direction."
      introduction={labels.notFound}
    >
      <ReturnHome label={labels.returnHome} />
    </PageLayout>
  );
}
