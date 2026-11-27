import yummy001 from './charts/yummy001.json';
import yozora001 from './charts/yozora001.json';
import poji001 from './charts/poji001.json';
import hgr001 from './charts/hgr001.json';
import playful001 from './charts/playful001.json';
import smgEasy from './charts/smg005-easy.json';
import smgHard from './charts/smg005-hard.json';
import bscEasy from './charts/bsc002-easy.json';
import bscHard from './charts/bsc002-hard.json';
import bsc002 from './charts/bsc002.json';
import smg005 from './charts/smg005.json';
import { copyChart, parseChart } from './chart-data';
import { BISCUIT_CASE, DEFAULT_SONG, PLAYFUL_ROMANTIC, HAPPY_GO_ROUND, POJI_POJI_GO, YOZORA_WITH_YOU, HEY_YUMMY } from './songs';
import type { Song } from './songs';
import { DEFAULT_DIFFICULTY } from './difficulties';
import type { Difficulty } from './difficulties';

const charts = new Map([
  ['yummy001', parseChart(JSON.stringify(yummy001), true, HEY_YUMMY)],
  ['yozora001', parseChart(JSON.stringify(yozora001), true, YOZORA_WITH_YOU)],
  ['poji001', parseChart(JSON.stringify(poji001), true, POJI_POJI_GO)],
  ['hgr001', parseChart(JSON.stringify(hgr001), true, HAPPY_GO_ROUND)],
  ['playful001', parseChart(JSON.stringify(playful001), true, PLAYFUL_ROMANTIC)],
  ['smg005-easy', parseChart(JSON.stringify(smgEasy), true, DEFAULT_SONG)],
  ['smg005-hard', parseChart(JSON.stringify(smgHard), true, DEFAULT_SONG)],
  ['bsc002-easy', parseChart(JSON.stringify(bscEasy), true, BISCUIT_CASE)],
  ['bsc002-hard', parseChart(JSON.stringify(bscHard), true, BISCUIT_CASE)],
  ['smg005', parseChart(JSON.stringify(smg005), true, DEFAULT_SONG)],
  ['bsc002', parseChart(JSON.stringify(bsc002), true, BISCUIT_CASE)],
]);
/** Fresh snapshots keep bundled charts independent from editor history and local storage. */
export function bundledChart(song: Song, difficulty: Difficulty = DEFAULT_DIFFICULTY) {
  const id = song.charts?.[difficulty] ?? (difficulty === DEFAULT_DIFFICULTY ? song.chartId : undefined);
  const chart = id ? charts.get(id) : undefined;
  return chart && chart.videoId === song.videoId ? copyChart(chart) : null;
}
