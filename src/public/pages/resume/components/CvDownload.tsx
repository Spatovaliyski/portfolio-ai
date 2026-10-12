import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { ButtonLink } from '../../../components/ui/Button.tsx';

export function CvDownload({ content }: { content: PortfolioContent }) {
  const profile = records(content, 'profile')[0];
  const labels = records(content, 'settings')[0].labels;
  const media = records(content, 'media').find((media) => media.id === profile.cvMediaId);

  if (!media?.publicPath) return null;

  return (
    <ButtonLink href={media.publicPath} download>
      {labels.downloadCv} ↓
    </ButtonLink>
  );
}
