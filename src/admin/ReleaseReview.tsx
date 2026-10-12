import { useEffect, useState } from 'react';
import { invoke } from './api.ts';
import type { Entity, PortfolioContent } from '../domain/schema.ts';

export function ReleaseReview({
  baseReleaseId,
  entities,
}: {
  baseReleaseId: string | null;
  entities: Entity[];
}) {
  const [base, setBase] = useState<PortfolioContent | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;

    setBase(null);
    setError('');
    if (baseReleaseId)
      invoke<{ snapshot: PortfolioContent }>('content', {
        action: 'release',
        releaseId: baseReleaseId,
      })
        .then((result) => {
          if (!disposed) setBase(result.snapshot);
        })
        .catch((error) => {
          if (!disposed) setError(error.message);
        });

    return () => {
      disposed = true;
    };
  }, [baseReleaseId]);

  return (
    <details className="release-review">
      <summary>Review {entities.length} selected saved revisions</summary>
      {error && <p role="alert">{error}</p>}
      {entities.map((entity) => {
        const old = base?.entities.find((e) => e.id === entity.id);
        const keys = [
          ...new Set([...Object.keys(old?.data ?? {}), ...Object.keys(entity.data)]),
        ].filter((key) => JSON.stringify(old?.data[key]) !== JSON.stringify(entity.data[key]));

        return (
          <article key={entity.id}>
            <h3>
              {entity.id} · {entity.status === 'archived' ? 'Remove' : old ? 'Update' : 'Add'}
            </h3>
            <p>
              Order: {old?.sortOrder ?? 'new'} → {entity.sortOrder}
            </p>
            {entity.status !== 'archived' &&
              keys.map((key) => (
                <details key={key}>
                  <summary>{key}</summary>
                  <div className="diff-values">
                    <section>
                      <h4>Current release</h4>
                      <pre>{JSON.stringify(old?.data[key] ?? null, null, 2)}</pre>
                    </section>
                    <section>
                      <h4>Selected revision</h4>
                      <pre>{JSON.stringify(entity.data[key], null, 2)}</pre>
                    </section>
                  </div>
                </details>
              ))}
          </article>
        );
      })}
      <p>
        Unselected records retain the existing release content. Edits saved after this selection use
        different revision IDs and are not included.
      </p>
    </details>
  );
}
