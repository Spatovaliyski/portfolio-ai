import type { PortfolioContent } from '../../../domain/schema.ts';
import { records } from '../../../domain/records.ts';
import { Hero } from './components/Hero.tsx';
import { FeaturedProduct } from './components/FeaturedProduct.tsx';
import { ProfessionalWork } from './components/ProfessionalWork.tsx';
import { AddonHighlights } from './components/AddonHighlights.tsx';
import { EngineeringApproach } from './components/EngineeringApproach.tsx';
import { GitHubSummary } from './components/GitHubSummary.tsx';
import { ContactSection } from './components/ContactSection.tsx';

export function HomePage({ content }: { content: PortfolioContent }) {
  const sections = records(content, 'settings')[0].sections;

  return (
    <>
      <Hero content={content} />
      {sections.map((section) => {
        switch (section) {
          case 'positioning':
            return null;
          case 'bausy':
            return <FeaturedProduct key={section} content={content} />;
          case 'work':
            return <ProfessionalWork key={section} content={content} />;
          case 'pets':
            return <AddonHighlights key={section} content={content} />;
          case 'approach':
            return <EngineeringApproach key={section} content={content} />;
          case 'github':
            return <GitHubSummary key={section} content={content} />;
          case 'contact':
            return <ContactSection key={section} content={content} />;
        }
      })}
    </>
  );
}
