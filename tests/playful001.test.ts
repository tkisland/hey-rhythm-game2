import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {convertMidi,readMidi} from '../src/midi';
import {bundledChart} from '../src/bundled-charts';
import {PLAYFUL_ROMANTIC,findSong,isPublicDifficulty} from '../src/songs';
import {emptyChart} from '../src/chart-data';
import {playableNotes} from '../src/note-display';
import chart from '../src/charts/playful001.json';

const input=readFileSync(new URL('../charts/source/game-PLAYFUL.mid',import.meta.url));
const config=JSON.parse(readFileSync(new URL('../charts/source/game-PLAYFUL.config.json',import.meta.url),'utf8'));
it('ships the corrected PLAYFUL MIDI exactly at video 0.9s, with its authored tempo and gestures',()=>{
  const midi=readMidi(input),converted=convertMidi(input,config),notes=playableNotes(converted.notes);
  expect(converted).toEqual(chart);expect(bundledChart(PLAYFUL_ROMANTIC)).toEqual(converted);
  expect(midi.notes).toHaveLength(568);expect(midi.notes.some(n=>n.pitch===37)).toBe(false);
  expect(converted).toMatchObject({videoId:'94DtjMOtbP4',title:'PLAYFUL ROMANTIC',startTime:.9,beatOrigin:.9});
  expect(converted.notes).toHaveLength(559);expect(notes).toHaveLength(539);
  expect(notes.filter(n=>n.type==='hold'&&!n.gimmick)).toHaveLength(23);
  for(const [gimmick,count] of [['box',4],['dd',3],['slide',3]] as const)expect(notes.filter(n=>n.gimmick===gimmick)).toHaveLength(count);
  expect(converted.tempoChanges).toEqual(PLAYFUL_ROMANTIC.tempoChanges);
  for(const raw of midi.notes.filter(n=>n.pitch<50)){
    const time=Number((midi.secondsAt(raw.tick)+.9).toFixed(9));
    const note=converted.notes.find(n=>n.time===time&&n.lane===config.lanes[raw.pitch]&&!n.gimmick);
    expect(note?.type).toBe(raw.endTick-raw.tick>=1.5*midi.ppq?'hold':'tap');
  }
});
it('registers normal play, separate editor tempo defaults and no generated easy/hard charts',()=>{
  expect(findSong('playful-romantic')).toBe(PLAYFUL_ROMANTIC);
  expect(isPublicDifficulty(PLAYFUL_ROMANTIC,'normal')).toBe(true);
  expect(emptyChart(PLAYFUL_ROMANTIC)).toMatchObject({beatOrigin:.9,tempoChanges:chart.tempoChanges});
  for(const difficulty of ['easy','hard'] as const){
    expect(isPublicDifficulty(PLAYFUL_ROMANTIC,difficulty)).toBe(false);
    expect(bundledChart(PLAYFUL_ROMANTIC,difficulty)).toBeNull();
  }
  const copy=bundledChart(PLAYFUL_ROMANTIC)!;copy.notes.length=0;
  expect(bundledChart(PLAYFUL_ROMANTIC)!.notes).toHaveLength(559);
});
