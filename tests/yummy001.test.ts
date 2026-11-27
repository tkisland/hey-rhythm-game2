import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { bundledChart } from '../src/bundled-charts';
import { convertMidi, readMidi } from '../src/midi';
import { playableNotes } from '../src/note-display';
import { dailySong } from '../src/song-spotlight';
import { HEY_YUMMY, SONGS, isPublicDifficulty } from '../src/songs';
import { autoplayChart } from './chart-autoplay';
import chart from '../src/charts/yummy001.json';

it('converts the supplied MIDI at video time 7 with only the unassigned pitch omitted', () => {
  const input = readFileSync(new URL('../charts/source/game-heyyummy.mid', import.meta.url));
  const config = JSON.parse(readFileSync(new URL('../charts/source/game-heyyummy.config.json', import.meta.url), 'utf8'));
  const midi = readMidi(input);
  expect(midi.notes.filter(note => note.pitch === 48)).toEqual([expect.objectContaining({ tick: 150720 })]);
  expect(() => convertMidi(input, { ...config, ignoredPitches: [] })).toThrow('Unmapped MIDI pitch: 48');
  const converted = convertMidi(input, config);
  expect(converted).toEqual(chart);
  expect(bundledChart(HEY_YUMMY)).toEqual(chart);
  expect(converted).toMatchObject({ videoId: '5c1vfetSi8E', bpm: 150, startTime: 7, beatOrigin: 7 });
  expect(converted.notes[0]).toMatchObject({ time: 7, lane: 0, type: 'tap' });
  const notes = playableNotes(converted.notes);
  expect(notes).toHaveLength(557);
  expect(notes.filter(note => note.time === 132.6)).toEqual([expect.objectContaining({ gimmick: 'box' })]);
  expect(notes.filter(note => note.gimmick === 'box')).toHaveLength(2);
  expect(notes.filter(note => note.gimmick === 'slide')).toHaveLength(2);
  const game = autoplayChart(converted);
  expect(game.finished).toBe(true);
  expect(game.counts).toEqual({ PERFECT: 557, GREAT: 0, GOOD: 0, MISS: 0 });
});

it('offers only normal and adds the song to the next daily rotation', () => {
  expect(isPublicDifficulty(HEY_YUMMY, 'normal')).toBe(true);
  for (const difficulty of ['easy', 'hard'] as const) {
    expect(isPublicDifficulty(HEY_YUMMY, difficulty)).toBe(false);
    expect(bundledChart(HEY_YUMMY, difficulty)).toBeNull();
  }
  const at = (day: string) => dailySong(SONGS, Date.parse(`${day}T00:00:00+09:00`))?.id;
  expect(at('2026-12-01')).toBe('yozora-with-you');
  expect(at('2026-12-02')).toBe('super-mommy-girls');
  expect(at('2026-12-08')).toBe('hey-yummy');
});
