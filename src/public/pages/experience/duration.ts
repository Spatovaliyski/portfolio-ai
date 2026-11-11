const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Length of a role in whole calendar months, counting the start and end months
 * (Apr 2024 to Nov 2026 is 2 yrs 8 mos). Ongoing roles count up to `now`, in UTC.
 */
export function experienceDuration(start: string, end: string | null, now = new Date()): string {
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end
    ? end.split('-').map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const months = Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
  const years = Math.floor(months / 12);
  const rest = months % 12;

  return [years && plural(years, 'yr', 'yrs'), rest && plural(rest, 'mo', 'mos')]
    .filter(Boolean)
    .join(' ');
}
