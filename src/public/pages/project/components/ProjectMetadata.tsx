import type { Project } from '../../../../domain/schema.ts';

export function ProjectMetadata({
  project,
  labels,
}: {
  project: Project;
  labels: Record<string, string>;
}) {
  return (
    <div className="case-meta">
      <section>
        <span className="eyebrow">{labels.ownership}</span>
        <p>{project.ownership}</p>
      </section>
      <section>
        <span className="eyebrow">{labels.technologies}</span>
        <p>{project.technologies.join(' · ') || labels.independentProduct}</p>
      </section>
      <section>
        <span className="eyebrow">{labels.status}</span>
        <p>
          {project.status} · {project.dates}
        </p>
      </section>
    </div>
  );
}
