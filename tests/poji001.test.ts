import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {convertMidi,readMidi} from '../src/midi';
import {bundledChart} from '../src/bundled-charts';
import {POJI_POJI_GO,findSong,isPublicDifficulty,songStorageKey} from '../src/songs';
import {emptyChart} from '../src/chart-data';
import {playableNotes} from '../src/note-display';
import chart from '../src/charts/poji001.json';

const input=readFileSync(new URL('../charts/source/game-POJIGO.mid',import.meta.url));
const config=JSON.parse(readFileSync(new URL('../charts/source/game-POJIGO.config.json',import.meta.url),'utf8'));
it('preserves the supplied POJI POJI GO MIDI, its initial rest and 1.5-beat hold threshold',()=>{
  const midi=readMidi(input),converted=convertMidi(input,config),notes=playableNotes(converted.notes);
  expect(converted).toEqual(chart);expect(bundledChart(POJI_POJI_GO)).toEqual(converted);
  expect(midi.notes).toHaveLength(791);expect(converted.notes).toHaveLength(791);expect(notes).toHaveLength(776);
  expect(converted).toMatchObject({videoId:'F0bagOeDMFc',title:'POJI POJI GO',bpm:195.000195,beatOrigin:3.41,startTime:4.025384});
  expect(converted.tempoChanges).toBeUndefined();expect(config.pitchAliases).toBeUndefined();
  expect(notes.filter(n=>n.type==='tap'&&!n.gimmick)).toHaveLength(767);
  expect(notes.filter(n=>n.type==='hold'&&!n.gimmick)).toHaveLength(6);
  expect(notes.filter(n=>n.gimmick==='box')).toHaveLength(3);
  expect(notes.some(n=>n.gimmick==='dd'||n.gimmick==='slide')).toBe(false);
  for(const raw of midi.notes.filter(n=>n.pitch<50)){
    const time=Number((midi.secondsAt(raw.tick)+3.41).toFixed(9));
    const note=converted.notes.find(n=>n.time===time&&n.lane===config.lanes[raw.pitch]&&!n.gimmick);
    expect(note?.type).toBe(raw.endTick-raw.tick>=1.5*midi.ppq?'hold':'tap');
  }
});
it('registers only normal difficulty with isolated storage and the authored editor beat origin',()=>{
  expect(findSong('poji-poji-go')).toBe(POJI_POJI_GO);
  expect(isPublicDifficulty(POJI_POJI_GO,'normal')).toBe(true);
  expect(emptyChart(POJI_POJI_GO)).toMatchObject({videoId:'F0bagOeDMFc',bpm:195.000195,beatOrigin:3.41});
  expect(songStorageKey('hey-rhythm-editor-v1',POJI_POJI_GO)).toBe('hey-rhythm-editor-v1:poji-poji-go');
  for(const difficulty of ['easy','hard'] as const){
    expect(isPublicDifficulty(POJI_POJI_GO,difficulty)).toBe(false);
    expect(bundledChart(POJI_POJI_GO,difficulty)).toBeNull();
  }
  const copy=bundledChart(POJI_POJI_GO)!;copy.notes.length=0;
  expect(bundledChart(POJI_POJI_GO)!.notes).toHaveLength(791);
});
