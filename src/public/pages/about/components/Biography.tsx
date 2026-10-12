import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { TextLink } from '../../../components/ui/TextLink.tsx';

export function Biography({ content }: { content: PortfolioContent }) {
  const profile = records(content, 'profile')[0];
  const labels = records(content, 'settings')[0].labels;

  return (
    <div className="about-copy">
      <p>{profile.biography}</p>
      <h2>{labels.aboutTitle}</h2>
      <p>{profile.positioning}</p>
      <TextLink href="/projects/">{labels.work}</TextLink>
    </div>
  );
}
