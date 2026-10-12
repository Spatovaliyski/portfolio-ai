import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';

export function Qualifications({ content }: { content: PortfolioContent }) {
  const qualifications = records(content, 'qualification');
  const labels = records(content, 'settings')[0].labels;

  return (
    <section className="qualifications">
      <h2>{labels.qualifications}</h2>
      {qualifications.map((qualification) => (
        <article key={qualification.id}>
          <h3>{qualification.title}</h3>
          <p>{[qualification.institution, qualification.dates].filter(Boolean).join(' · ')}</p>
          <p>{qualification.details}</p>
        </article>
      ))}
    </section>
  );
}
