import type { PortfolioContent } from '../../../domain/schema.ts';
import { ExperienceTimeline } from '../experience/components/ExperienceTimeline.tsx';
import { Qualifications } from './components/Qualifications.tsx';
import { SkillEvidence } from './components/SkillEvidence.tsx';
import { CvDownload } from './components/CvDownload.tsx';

export function ResumePage({ content }: { content: PortfolioContent }) {
  return (
    <>
      <ExperienceTimeline content={content} />
      <Qualifications content={content} />
      <SkillEvidence content={content} />
      <CvDownload content={content} />
    </>
  );
}
