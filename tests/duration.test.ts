import { describe, expect, it } from 'vitest';
import { experienceDuration } from '../src/public/pages/experience/duration.ts';

describe('experienceDuration', () => {
  it('counts both the start and end months', () => {
    expect(experienceDuration('2017-05-01', '2021-06-30')).toBe('4 yrs 2 mos');
    expect(experienceDuration('2021-07-01', '2022-11-30')).toBe('1 yr 5 mos');
    expect(experienceDuration('2022-12-01', '2023-10-31')).toBe('11 mos');
  });

  it('uses singular units and drops empty parts', () => {
    expect(experienceDuration('2020-01-01', '2020-12-31')).toBe('1 yr');
    expect(experienceDuration('2020-03-01', '2020-03-31')).toBe('1 mo');
  });

  it('counts an ongoing role up to the current month', () => {
    expect(experienceDuration('2024-04-01', null, new Date('2026-11-11T12:00:00Z'))).toBe(
      '2 yrs 8 mos',
    );
  });
});
