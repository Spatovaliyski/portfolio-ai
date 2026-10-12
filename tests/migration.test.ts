import { expect, it } from 'vitest';
import { careerDate, importWordPress, type WP } from '../scripts/wordpress.ts';

it('preserves original timestamps, stable identities, dates and unsupported source evidence', () => {
  const post: WP = {
    id: 220,
    slug: 'old',
    title: { rendered: 'Example' },
    content: {
      rendered:
        '<p>Safe text.</p><script>attack()</script><iframe src="https://example.com"></iframe>',
    },
    date_gmt: '2024-04-17T22:28:53',
    modified_gmt: '2024-04-18T10:00:00',
  };
  const first = importWordPress({ projects: [], experience: [], posts: [post], media: [] }, {});
  const second = importWordPress({ projects: [], experience: [], posts: [post], media: [] }, {});

  expect(first).toEqual(second);
  expect(first.entities[0].id).toBe('wp-spatovaliyski-posts-220');
  expect(first.entities[0].data.publishedAt).toBe('2024-04-17T22:28:53Z');
  expect(JSON.stringify(first.entities)).not.toContain('attack');
  expect(first.issues[0]).toContain('unsupported');
  expect(careerDate('July 2021')).toBe('2021-07-01');
  expect(careerDate('October 2023', true)).toBe('2023-10-31');
  expect(careerDate('uncertain 2021')).toBeNull();
});
