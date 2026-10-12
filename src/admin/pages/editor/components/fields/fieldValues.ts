export type Value = string | number | boolean | null | Value[] | { [key: string]: Value };

export const titleCase = (value: string) =>
  value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (character) => character.toUpperCase());

export function moveItem<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const next = [...items];
  const destination = index + offset;

  if (destination < 0 || destination >= next.length) return next;

  [next[index], next[destination]] = [next[destination], next[index]];

  return next;
}
