import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { Arrow } from '../../../components/ui/Arrow.tsx';
import { TextLink } from '../../../components/ui/TextLink.tsx';

export function ContactDetails({ content }: { content: PortfolioContent }) {
  const profile = records(content, 'profile')[0];
  const labels = records(content, 'settings')[0].labels;

  return (
    <div className="contact-details">
      <a className="contact-email" href={`mailto:${profile.email}`}>
        {profile.email} <Arrow />
      </a>
      <div>
        {profile.links.map((link) => (
          <TextLink key={link.url} href={link.url}>
            {link.label}
          </TextLink>
        ))}
      </div>
      <p>
        {labels.availability}: {profile.availabilityLabel}
      </p>
    </div>
  );
}
