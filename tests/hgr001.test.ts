import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {convertMidi,readMidi} from '../src/midi';
import {bundledChart} from '../src/bundled-charts';
import {HAPPY_GO_ROUND,findSong,isPublicDifficulty} from '../src/songs';
import {emptyChart} from '../src/chart-data';
import {playableNotes} from '../src/note-display';
import chart from '../src/charts/hgr001.json';

const input=readFileSync(new URL('../charts/source/game-HAPPYGOROUND.mid',import.meta.url));
const config=JSON.parse(readFileSync(new URL('../charts/source/game-HAPPYGOROUND.config.json',import.meta.url),'utf8'));
it('ships the final corrected Happy Go Round MIDI exactly at video 1.2s with all authored gestures',()=>{
  const midi=readMidi(input),converted=convertMidi(input,config),notes=playableNotes(converted.notes);
  expect(converted).toEqual(chart);expect(bundledChart(HAPPY_GO_ROUND)).toEqual(converted);
  expect(midi.notes).toHaveLength(708);expect(midi.notes.some(n=>[61,63,74,77].includes(n.pitch))).toBe(false);
  expect(midi.notes.filter(n=>n.pitch===45&&n.tick===2640)).toHaveLength(1);
  expect(config.pitchAliases).toBeUndefined();
  expect(converted).toMatchObject({videoId:'y5Qz8PcPhYs',title:'Happy Go Round',bpm:220.00022,startTime:1.2,beatOrigin:1.2});
  expect(converted.tempoChanges).toBeUndefined();
  expect(notes.filter(n=>n.gimmick==='slide').map(n=>[n.lane,...(n.path??[]).map(p=>p.lane)])).toEqual([[1,0],[5,4,3,2,1,0]]);
  // The authored tap at the final pink slide tail must not require a second release.
  expect(converted.notes.some(n=>n.type==='tap'&&!n.gimmick&&n.lane===0&&n.time===167.018016)).toBe(true);
  expect(notes.some(n=>n.type==='tap'&&!n.gimmick&&n.lane===0&&n.time===167.018016)).toBe(false);
  expect(converted.notes).toHaveLength(702);expect(notes).toHaveLength(676);
  expect(notes.filter(n=>n.type==='hold'&&!n.gimmick)).toHaveLength(10);
  for(const [gimmick,count] of [['box',5],['dd',0],['slide',2]] as const)expect(notes.filter(n=>n.gimmick===gimmick)).toHaveLength(count);
  for(const raw of midi.notes.filter(n=>n.pitch<50)){
    const time=Number((midi.secondsAt(raw.tick)+1.2).toFixed(9));
    const note=converted.notes.find(n=>n.time===time&&n.lane===config.lanes[raw.pitch]&&!n.gimmick);
    expect(note?.type).toBe(raw.endTick-raw.tick>=1.5*midi.ppq?'hold':'tap');
  }
});
it('registers the normal chart and authored editor defaults without additional difficulties',()=>{
  expect(findSong('happy-go-round')).toBe(HAPPY_GO_ROUND);
  expect(isPublicDifficulty(HAPPY_GO_ROUND,'normal')).toBe(true);
  expect(emptyChart(HAPPY_GO_ROUND)).toMatchObject({videoId:'y5Qz8PcPhYs',bpm:220.00022,beatOrigin:1.2});
  for(const difficulty of ['easy','hard'] as const){
    expect(isPublicDifficulty(HAPPY_GO_ROUND,difficulty)).toBe(false);
    expect(bundledChart(HAPPY_GO_ROUND,difficulty)).toBeNull();
  }
  const copy=bundledChart(HAPPY_GO_ROUND)!;copy.notes.length=0;
  expect(bundledChart(HAPPY_GO_ROUND)!.notes).toHaveLength(702);
});
