import {describe,it,expect} from 'vitest';
import {EditorModel,parseChart,MAX_TIME} from '../src/editor-model';
import {VIDEO_ID} from '../src/chart';
import type {Chart} from '../src/chart';

const fixture = (): Chart => ({videoId:VIDEO_ID,title:'Alignment',bpm:120,beatOrigin:3.3,startTime:3.8,
  tempoChanges:[{time:6,bpm:180}],notes:[
    {id:1,lane:0,type:'tap',time:3.8,sourceTime:3.79},
    {id:2,lane:2,type:'hold',time:4,endTime:5,sourceTime:4.01,sourceEndTime:5.01},
    {id:3,lane:3,type:'hold',gimmick:'slide',time:5,endTime:7,path:[{time:6,lane:5}]},
    ...Array.from({length:6},(_,lane)=>({id:4+lane,lane,type:'tap' as const,time:8,gimmick:'box' as const,boxId:1,sourceTime:8+lane*.01})),
    {id:10,lane:0,type:'tap',time:9,gimmick:'dd'},
  ]});
describe('whole-chart start alignment',()=>{
  it('shifts every timing and tempo together, preserving the initial rest, IDs and note shapes',()=>{
    const before=fixture(),model=new EditorModel(before);
    expect(model.alignStart(3.4)).toBe(true);
    const after=model.chart;
    expect(after.beatOrigin).toBe(3.4);expect(after.startTime).toBe(3.9);
    expect(after.notes[0].time-after.beatOrigin!).toBeCloseTo(.5);
    expect(after.tempoChanges).toEqual([{time:6.1,bpm:180}]);
    expect(after.notes[1]).toMatchObject({time:4.1,endTime:5.1,sourceTime:4.11,sourceEndTime:5.11});
    expect(after.notes[2]).toMatchObject({time:5.1,endTime:7.1,path:[{time:6.1,lane:5}]});
    expect(after.notes.filter(n=>n.gimmick==='box').map(n=>n.sourceTime)).toEqual([8.1,8.11,8.12,8.13,8.14,8.15]);
    expect(after.notes.at(-1)).toMatchObject({id:10,time:9.1,gimmick:'dd'});
    expect(parseChart(JSON.stringify(after))).toEqual(after);
    expect(before).toEqual(fixture()); // No mutation of a saved document.
    expect(model.undo()).toBe(true);expect(model.chart).toEqual(before);
    expect(model.redo()).toBe(true);expect(model.chart).toEqual(after);
  });
  it('keeps original-time quantize results aligned after the shift and repeated nudges do not drift',()=>{
    const model=new EditorModel(fixture()),reference=new EditorModel(fixture());
    reference.quantize(4,false,true);
    for(let i=0;i<100;i++)model.alignStart(Number((model.chart.beatOrigin!+.01).toFixed(9)));
    model.quantize(4,false,true);
    expect(model.chart.beatOrigin).toBe(4.3);
    model.chart.notes.forEach((note,i)=>expect(note.time).toBeCloseTo(reference.chart.notes[i].time+1,8));
  });
  it('keeps MIDI zero separate from beat grid edits, including a saved and reopened document',()=>{
    const model=new EditorModel(fixture());model.metadata(120,3.5);
    expect(model.chart.midiOrigin).toBe(3.3);expect(model.chart.notes[0].time).toBe(3.8);
    const reopened=new EditorModel(parseChart(JSON.stringify(model.chart)));
    reopened.alignStart(3.4);
    expect(reopened.chart.beatOrigin).toBe(3.6);expect(reopened.chart.notes[0].time).toBe(3.9);
    expect(reopened.chart.midiOrigin).toBe(3.4);
    const blank=new EditorModel({...fixture(),startTime:0,notes:[],tempoChanges:[]});
    blank.alignStart(1);expect(blank.chart.beatOrigin).toBe(1);expect(blank.chart.startTime).toBe(0);
  });
  it('rejects invalid origins or out-of-bounds note, source and tempo times atomically',()=>{
    for(const origin of [NaN,Infinity,-1,MAX_TIME+1,0,MAX_TIME]){
      const chart=fixture();chart.notes[0].sourceTime=.05;
      const model=new EditorModel(chart);
      expect(()=>model.alignStart(origin)).toThrow();expect(model.chart).toEqual(chart);expect(model.canUndo).toBe(false);
    }
    for(const changed of [
      {...fixture(),tempoChanges:[{time:MAX_TIME,bpm:180}]},
      {...fixture(),notes:[{id:1,type:'hold' as const,lane:0,time:4,endTime:MAX_TIME}]},
    ]){
      const model=new EditorModel(changed);expect(()=>model.alignStart(3.4)).toThrow();expect(model.chart).toEqual(changed);
    }
    const model=new EditorModel(fixture());expect(model.alignStart(3.3)).toBe(false);expect(model.canUndo).toBe(false);
  });
});
