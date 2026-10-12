import type { PortfolioContent } from '../domain/schema.ts';
import { records } from '../domain/records.ts';
import { projectPath } from './routes.ts';
import { Blocks } from './components/content/Blocks.tsx';
import { PageLayout } from './components/ui/PageLayout.tsx';
import { HomePage } from './pages/home/HomePage.tsx';
import { ProjectsPage } from './pages/projects/ProjectsPage.tsx';
import { ProjectPage } from './pages/project/ProjectPage.tsx';
import { AddonsPage } from './pages/addons/AddonsPage.tsx';
import { ExperiencePage } from './pages/experience/ExperiencePage.tsx';
import { AboutPage } from './pages/about/AboutPage.tsx';
import { GitHubPage } from './pages/github/GitHubPage.tsx';
import { NotesPage } from './pages/notes/NotesPage.tsx';
import { NotePage } from './pages/note/NotePage.tsx';
import { ContactPage } from './pages/contact/ContactPage.tsx';
import { ResumePage } from './pages/resume/ResumePage.tsx';
import { PrivacyPage } from './pages/privacy/PrivacyPage.tsx';
import { NotFoundPage } from './pages/not-found/NotFoundPage.tsx';

function CollectionContent({ content, path }: { content: PortfolioContent; path: string }) {
  switch (path) {
    case '/projects/':
      return <ProjectsPage content={content} />;
    case '/pet-projects/':
      return <AddonsPage content={content} />;
    case '/experience/':
      return <ExperiencePage content={content} />;
    case '/about/':
      return <AboutPage content={content} />;
    case '/github/':
      return <GitHubPage content={content} />;
    case '/notes/':
      return <NotesPage content={content} />;
    case '/contact/':
      return <ContactPage content={content} />;
    case '/resume/':
      return <ResumePage content={content} />;
    case '/privacy/':
      return <PrivacyPage content={content} />;
  }

  return null;
}

export function RoutePage({ content, path }: { content: PortfolioContent; path: string }) {
  if (path === '/') return <HomePage content={content} />;

  const project = records(content, 'project').find(
    (project) => projectPath(project) === path && project.kind !== 'archive',
  );

  if (project) return <ProjectPage content={content} project={project} />;

  const note = records(content, 'note').find((note) => `/notes/${note.slug}/` === path);

  if (note) return <NotePage content={content} note={note} />;

  const page = records(content, 'page').find((page) => page.path === path);

  if (!page) return <NotFoundPage content={content} />;

  return (
    <PageLayout eyebrow={page.eyebrow} title={page.title} introduction={page.introduction}>
      <CollectionContent content={content} path={path} />
      {path !== '/privacy/' && <Blocks content={content} blocks={page.blocks} />}
    </PageLayout>
  );
}
