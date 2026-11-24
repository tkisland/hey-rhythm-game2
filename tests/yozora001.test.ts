import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {convertMidi,readMidi} from '../src/midi';
import {bundledChart} from '../src/bundled-charts';
import {YOZORA_WITH_YOU,findSong,isPublicDifficulty,songStorageKey} from '../src/songs';
import {emptyChart} from '../src/chart-data';
import {playableNotes} from '../src/note-display';
import chart from '../src/charts/yozora001.json';
const input=readFileSync(new URL('../charts/source/game-YOZORAWITHYOU.mid',import.meta.url));
const config=JSON.parse(readFileSync(new URL('../charts/source/game-YOZORAWITHYOU.config.json',import.meta.url),'utf8'));
it('preserves the supplied Yozora MIDI, 3.5-second origin and 1.5-beat hold threshold',()=>{
  const midi=readMidi(input),converted=convertMidi(input,config),notes=playableNotes(converted.notes);
  expect(converted).toEqual(chart);expect(bundledChart(YOZORA_WITH_YOU)).toEqual(converted);
  expect(midi.notes).toHaveLength(505);expect(converted.notes).toHaveLength(504);expect(notes).toHaveLength(499);
  expect(converted).toMatchObject({videoId:'5Z6C4Zhbkl0',title:'夜空ウィズユー',bpm:200,beatOrigin:3.5,startTime:3.5});
  expect(converted.tempoChanges).toBeUndefined();expect(config.pitchAliases).toBeUndefined();
  expect(notes.filter(n=>n.type==='tap'&&!n.gimmick)).toHaveLength(477);
  expect(notes.filter(n=>n.type==='hold'&&!n.gimmick)).toHaveLength(20);
  expect(notes.filter(n=>n.gimmick==='box')).toHaveLength(1);
  expect(notes.filter(n=>n.gimmick==='slide')).toEqual([expect.objectContaining({lane:0,time:100.7,endTime:107.9,path:[{lane:1,time:104.3}]})]);
  expect(notes.some(n=>n.gimmick==='dd')).toBe(false);
  for(const raw of midi.notes.filter(n=>n.pitch<50)){
    const time=Number((midi.secondsAt(raw.tick)+3.5).toFixed(9));
    const note=converted.notes.find(n=>n.time===time&&n.lane===config.lanes[raw.pitch]&&!n.gimmick);
    expect(note?.type).toBe(raw.endTick-raw.tick>=1.5*midi.ppq?'hold':'tap');
  }
});
it('exposes only normal difficulty and isolates Yozora editor storage',()=>{
  expect(findSong('yozora-with-you')).toBe(YOZORA_WITH_YOU);
  expect(isPublicDifficulty(YOZORA_WITH_YOU,'normal')).toBe(true);
  expect(emptyChart(YOZORA_WITH_YOU)).toMatchObject({videoId:'5Z6C4Zhbkl0',bpm:200,beatOrigin:3.5});
  expect(songStorageKey('hey-rhythm-editor-v1',YOZORA_WITH_YOU)).toBe('hey-rhythm-editor-v1:yozora-with-you');
  for(const difficulty of ['easy','hard'] as const){
    expect(isPublicDifficulty(YOZORA_WITH_YOU,difficulty)).toBe(false);
    expect(bundledChart(YOZORA_WITH_YOU,difficulty)).toBeNull();
  }
  const copy=bundledChart(YOZORA_WITH_YOU)!;copy.notes.length=0;
  expect(bundledChart(YOZORA_WITH_YOU)!.notes).toHaveLength(504);
});
