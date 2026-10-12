import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { ExperienceItem } from './ExperienceItem.tsx';

export function ExperienceTimeline({ content }: { content: PortfolioContent }) {
  const labels = records(content, 'settings')[0].labels;

  return (
    <div className="timeline">
      {records(content, 'experience').map((experience) => (
        <ExperienceItem key={experience.id} experience={experience} presentLabel={labels.present} />
      ))}
    </div>
  );
}
