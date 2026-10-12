import type { AdminWorkspace } from '../../../useAdminWorkspace.ts';

export function SynchronizationJobs({ workspace }: { workspace: AdminWorkspace }) {
  const { busy, run, synchronizeGitHub, dashboard } = workspace;

  return (
    <section className="admin-panel">
      <h2>GitHub jobs</h2>
      <button disabled={busy} onClick={() => run(synchronizeGitHub)}>
        Request synchronization
      </button>
      {dashboard.jobs.map((job) => (
        <p key={job.id}>
          {job.kind} · {job.state}
          {job.error ? ` · ${job.error}` : ''}
        </p>
      ))}
    </section>
  );
}
