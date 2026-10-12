import type { AdminWorkspace } from '../../../useAdminWorkspace.ts';

export function DashboardStats({ workspace }: { workspace: AdminWorkspace }) {
  const { dashboard } = workspace;

  return (
    <div className="dashboard-stats">
      <article>
        <span>Editable records</span>
        <strong>{dashboard.entities.length}</strong>
      </article>
      <article>
        <span>Latest publication</span>
        <strong>{dashboard.releases[0]?.state ?? 'Not published'}</strong>
      </article>
      <article>
        <span>Integration jobs</span>
        <strong>{dashboard.jobs[0]?.state ?? 'Not synchronized'}</strong>
      </article>
    </div>
  );
}
