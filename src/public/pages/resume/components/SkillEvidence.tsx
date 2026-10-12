import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { projectPath } from '../../../routes.ts';

export function SkillEvidence({ content }: { content: PortfolioContent }) {
  const skills = records(content, 'skill');
  const projects = records(content, 'project');
  const experiences = records(content, 'experience');
  const labels = records(content, 'settings')[0].labels;

  function evidenceLink(id: string) {
    const project = projects.find((project) => project.id === id);
    const experience = experiences.find((experience) => experience.id === id);

    return (
      <a key={id} href={project ? projectPath(project) : '/experience/'}>
        {project?.title ?? experience?.employer ?? id} ↗
      </a>
    );
  }

  return (
    <section className="skill-evidence">
      <h2>{labels.skillContext}</h2>
      {skills.map((skill) => (
        <article key={skill.id}>
          <h3>{skill.label}</h3>
          <p>{skill.category}</p>
          {skill.evidenceIds.map(evidenceLink)}
        </article>
      ))}
    </section>
  );
}
