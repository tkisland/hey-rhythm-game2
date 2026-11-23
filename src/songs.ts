import { DEFAULT_DIFFICULTY } from './difficulties';
import type { Difficulty } from './difficulties';
export interface Song {
  id: string;
  title: string;
  artist: string;
  videoId: string;
  bpm: number;
  startTime: number;
  chartId?: string;
  charts?: Partial<Record<Difficulty,string>>;
  publicDifficulties?: readonly Difficulty[];
  /** Editor defaults only; saved/imported charts keep their own tempo maps. */
  tempoChanges?: readonly { time: number; bpm: number }[];
  tempoEstimated?: boolean;
}
export const DEFAULT_SONG: Song = {
  id: 'super-mommy-girls', title: 'SUPER MOMMY GIRLS', artist: 'Hey!Mommy!',
  videoId: 'pJDfWpZ7CI4', bpm: 140, startTime: 12, chartId: 'smg005', charts:{easy:'smg005-easy',hard:'smg005-hard'}, publicDifficulties:['normal'],
};
export const BISCUIT_CASE: Song = {
  id: 'biscuit-case', title: 'ビスケットケース', artist: 'Hey!Mommy!',
  // MIDI tick zero is placed at video 2.95s; editor defaults use the authored tempo map.
  videoId: 'JUsGoi24rug', bpm: 200, startTime: 2.95, chartId: 'bsc002', charts:{easy:'bsc002-easy',hard:'bsc002-hard'}, publicDifficulties:['normal'],
  tempoChanges: [
    {time:24.549375,bpm:205.000649169},
    {time:100.647304754,bpm:200},
    {time:112.647304754,bpm:205.000649169},
    {time:188.744624754,bpm:203.000345101},
    {time:213.572168754,bpm:205.000649169},
    {time:235.83734215,bpm:200},
  ],
};
export const PLAYFUL_ROMANTIC: Song = {
  id: 'playful-romantic', title: 'PLAYFUL ROMANTIC', artist: 'Hey!Mommy!',
  videoId: '94DtjMOtbP4', bpm: 98.000143734, startTime: 1.18, chartId: 'playful001', publicDifficulties: ['normal'],
  tempoChanges: [
    {time:10.975904,bpm:195.000195},
    {time:20.822048,bpm:196.000287467},
  ],
};
export const HAPPY_GO_ROUND: Song = {
  id: 'happy-go-round', title: 'Happy Go Round', artist: 'Hey!Mommy!',
  videoId: 'y5Qz8PcPhYs', bpm: 220.00022, startTime: 1.2, chartId: 'hgr001', publicDifficulties: ['normal'],
};
export const POJI_POJI_GO: Song = {
  id: 'poji-poji-go', title: 'POJI POJI GO', artist: 'Hey!Mommy!',
  videoId: 'F0bagOeDMFc', bpm: 195.000195, startTime: 3.2, chartId: 'poji001', publicDifficulties: ['normal'],
};
/** Register additional songs here; routing and storage use the stable ID. */
export const SONGS: readonly Song[] = [DEFAULT_SONG, BISCUIT_CASE, PLAYFUL_ROMANTIC, HAPPY_GO_ROUND, POJI_POJI_GO];
export function findSong(id: string | null): Song | undefined {
  return id === null ? DEFAULT_SONG : SONGS.find(song => song.id === id);
}
export function songUrl(song: Song, page: 'game' | 'editor', chart: boolean | 'test' | 'bundled' = false, difficulty: Difficulty = DEFAULT_DIFFICULTY): string {
  const query = new URLSearchParams({ song: song.id });
  if (difficulty !== DEFAULT_DIFFICULTY) query.set('difficulty',difficulty);
  if (chart && page === 'game') query.set('chart', chart === true ? 'custom' : chart);
  return `./${page}.html?${query}`;
}
export function songStorageKey(base: string, song: Song, difficulty: Difficulty = DEFAULT_DIFFICULTY): string {
  // Keep existing data for the original song without migration writes.
  const key = song.id === DEFAULT_SONG.id ? base : `${base}:${song.id}`;
  return difficulty === DEFAULT_DIFFICULTY ? key : `${key}:${difficulty}`;
}
export function songVideoUrl(song: Song): string { return `https://www.youtube.com/watch?v=${song.videoId}`; }

/** Publication is independent of retained charts and administrator drafts. */
export function isPublicDifficulty(song:Song,difficulty:Difficulty):boolean {
  return (song.publicDifficulties ?? [DEFAULT_DIFFICULTY]).includes(difficulty);
}
