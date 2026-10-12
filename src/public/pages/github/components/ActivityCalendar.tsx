import type { GitHubSnapshot } from '../../../../domain/schema.ts';

export function ActivityCalendar({ snapshot }: { snapshot: GitHubSnapshot }) {
  if (!snapshot.fetchedAt) return null;
  const cutoff = new Date(new Date(snapshot.fetchedAt).getTime() - 90 * 86400000)
    .toISOString()
    .slice(0, 10);
  const counts = new Map<string, number>();

  for (const repo of snapshot.repositories)
    for (const commit of repo.commits) {
      const day = commit.date.slice(0, 10);

      if (day >= cutoff) counts.set(day, (counts.get(day) ?? 0) + 1);
    }
  if (!counts.size) return null;

  return (
    <section className="calendar">
      <h2>Public commit activity</h2>
      <div className="calendar-grid" aria-hidden="true">
        {Array.from({ length: 90 }, (_, index) => {
          const day = new Date(new Date(snapshot.fetchedAt!).getTime() - (89 - index) * 86400000)
            .toISOString()
            .slice(0, 10);

          return [day, counts.get(day) ?? 0] as const;
        }).map(([day, value]) => (
          <span
            key={day}
            title={`${day}: ${value}`}
            style={{ opacity: value ? Math.min(0.3 + value * 0.15, 1) : 0.08 }}
          />
        ))}
      </div>
      <details>
        <summary>Read activity dates and counts</summary>
        <table>
          <caption>Distinct owner-authored non-merge commits by UTC date</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Commits</th>
            </tr>
          </thead>
          <tbody>
            {[...counts.entries()]
              .sort()
              .reverse()
              .map(([day, value]) => (
                <tr key={day}>
                  <th scope="row">{day}</th>
                  <td>{value}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
