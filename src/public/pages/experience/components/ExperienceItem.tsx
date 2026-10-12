import { records } from '../../../../domain/records.ts';

type Experience = ReturnType<typeof records<'experience'>>[number];

export function ExperienceItem({
  experience,
  presentLabel,
}: {
  experience: Experience;
  presentLabel: string;
}) {
  return (
    <article>
      <div>
        <time>
          {experience.start.slice(0, 7)} — {experience.end?.slice(0, 7) ?? presentLabel}
        </time>
        <span>{experience.location}</span>
      </div>
      <section>
        <h2>{experience.employer}</h2>
        <h3>{experience.role}</h3>
        <p>{experience.summary}</p>
        {experience.achievements.length > 0 && (
          <ul>
            {experience.achievements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
