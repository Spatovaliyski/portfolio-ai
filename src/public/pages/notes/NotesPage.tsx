import type { PortfolioContent } from '../../../domain/schema.ts';
import { NoteList } from './components/NoteList.tsx';

export function NotesPage({ content }: { content: PortfolioContent }) {
  return <NoteList content={content} />;
}
