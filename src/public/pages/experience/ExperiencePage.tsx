import type { PortfolioContent } from '../../../domain/schema.ts';
import { ExperienceTimeline } from './components/ExperienceTimeline.tsx';
import { Qualifications } from '../resume/components/Qualifications.tsx';
import { SkillEvidence } from '../resume/components/SkillEvidence.tsx';
import { CvDownload } from '../resume/components/CvDownload.tsx';

export function ExperiencePage({ content }: { content: PortfolioContent }) {
  return (
    <>
      <ExperienceTimeline content={content} />
      <Qualifications content={content} />
      <SkillEvidence content={content} />
      <CvDownload content={content} />
    </>
  );
}
