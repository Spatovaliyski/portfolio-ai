import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { Arrow } from '../../../components/ui/Arrow.tsx';

export function NoteList({ content }: { content: PortfolioContent }) {
  const notes = records(content, 'note');
  const labels = records(content, 'settings')[0].labels;

  if (!notes.length) return <p>{labels.noNotes}</p>;

  return (
    <div className="notes-list">
      {notes.map((note) => (
        <article key={note.id}>
          <time dateTime={note.publishedAt}>{note.publishedAt}</time>
          <h2>
            <a href={`/notes/${note.slug}/`}>
              {note.title} <Arrow />
            </a>
          </h2>
          <p>{note.summary}</p>
        </article>
      ))}
    </div>
  );
}
