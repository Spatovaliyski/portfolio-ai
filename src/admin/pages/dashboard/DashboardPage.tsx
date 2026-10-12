import type { AdminWorkspace } from '../../useAdminWorkspace.ts';
import { DashboardStats } from './components/DashboardStats.tsx';
import { StarterContent } from './components/StarterContent.tsx';
import { PublicationPanel } from './components/PublicationPanel.tsx';
import { ReleaseHistory } from './components/ReleaseHistory.tsx';
import { SynchronizationJobs } from './components/SynchronizationJobs.tsx';

export function DashboardPage({ workspace }: { workspace: AdminWorkspace }) {
  const { dashboard } = workspace;

  return (
    <>
      <DashboardStats workspace={workspace} />
      {!dashboard.entities.length && <StarterContent workspace={workspace} />}
      <PublicationPanel workspace={workspace} />
      <ReleaseHistory workspace={workspace} />
      <SynchronizationJobs workspace={workspace} />
    </>
  );
}
