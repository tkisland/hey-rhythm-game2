import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { bundledChart } from '../src/bundled-charts';
import chart from '../src/charts/look001.json';
import { convertMidi } from '../src/midi';
import { dailySong } from '../src/song-spotlight';
import { LOOK, SONGS } from '../src/songs';
import { autoplayChart } from './chart-autoplay';

it('loads the supplied MIDI at video time zero and completes the normal chart', () => {
  const input = readFileSync(new URL('../charts/source/game-look.mid', import.meta.url));
  const config = JSON.parse(readFileSync(new URL('../charts/source/game-look.config.json', import.meta.url), 'utf8'));
  const converted = convertMidi(input, config);
  expect(converted).toEqual(chart);
  expect(bundledChart(LOOK)).toEqual(chart);
  expect(converted).toMatchObject({ videoId: 'vibCuo-dj6c', beatOrigin: 0, startTime: 2.879994 });
  const game = autoplayChart(converted);
  expect(game.finished).toBe(true);
  expect(game.counts).toEqual({ PERFECT: 521, GREAT: 0, GOOD: 0, MISS: 0 });
});

it('includes LOOK!! in the next daily rotation', () => {
  const at = (day: string) => dailySong(SONGS, Date.parse(`${day}T00:00:00+09:00`))?.id;
  expect(at('2026-12-09')).toBe('look');
  expect(at('2026-12-10')).toBe('super-mommy-girls');
});
