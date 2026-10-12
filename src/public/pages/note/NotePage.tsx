import type { PortfolioContent } from '../../../domain/schema.ts';
import { records } from '../../../domain/records.ts';
import { Blocks } from '../../components/content/Blocks.tsx';
import { PageLayout } from '../../components/ui/PageLayout.tsx';
import { PublicationDates } from './components/PublicationDates.tsx';

type Note = ReturnType<typeof records<'note'>>[number];

export function NotePage({ content, note }: { content: PortfolioContent; note: Note }) {
  const labels = records(content, 'settings')[0].labels;

  return (
    <PageLayout eyebrow={labels.noteLabel} title={note.title} introduction={note.summary}>
      <article className="note">
        <PublicationDates
          labels={labels}
          publishedAt={note.publishedAt}
          modifiedAt={note.modifiedAt}
        />
        <Blocks blocks={note.blocks} content={content} />
      </article>
    </PageLayout>
  );
}
