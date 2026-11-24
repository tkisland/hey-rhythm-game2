import {test,expect} from '@playwright/test';
import {api} from './mock-video';
const chart={videoId:'pJDfWpZ7CI4',title:'Alignment',bpm:120,beatOrigin:3.3,startTime:3.8,
 tempoChanges:[{time:8,bpm:180}],notes:[
 {id:1,lane:0,type:'tap',time:3.8,sourceTime:3.79},
 {id:2,lane:2,type:'hold',time:5,endTime:7},
 {id:3,lane:4,type:'tap',time:25},
 ]};
const stored=(page:import('@playwright/test').Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('hey-rhythm-editor-v1')!));
test.beforeEach(async({page})=>{
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:''}));
 await page.route('https://www.youtube.com/iframe_api',r=>r.fulfill({body:api}));
 await page.goto('/editor.html');await expect(page.locator('#record-toggle')).toBeEnabled();
 await page.locator('#import-chart').setInputFiles({name:'chart.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(chart))});
 await expect(page.locator('#save-status')).toContainText('保存しました');
});
test('adjusts, undoes, resets and persists the complete chart without reimporting MIDI',async({page})=>{
 if((page.viewportSize()?.width ?? 0)>=1000){
  const video=(await page.locator('.video-frame').boundingBox())!,notes=(await page.locator('.preview-field').boundingBox())!;
  expect(video.x+video.width).toBeLessThanOrEqual(notes.x);
  expect(video.y+video.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(notes.y+notes.height).toBeLessThanOrEqual(page.viewportSize()!.height);
 }
 await expect(page.locator('#alignment-origin')).toHaveValue('3.300');
 await expect(page.locator('#alignment-first')).toContainText('3.800秒');
 await page.locator('#alignment-plus-100').click();
 await expect(page.locator('#alignment-origin')).toHaveValue('3.400');
 await expect(page.locator('#alignment-first')).toContainText('3.900秒');
 await expect(page.locator('#midi-offset')).toHaveValue('3.4');
 await page.locator('#alignment-origin').fill('3.450');await page.locator('#alignment-origin').dispatchEvent('change');
 await expect(page.locator('#save-status')).toContainText('保存しました');
 expect(await stored(page)).toMatchObject({beatOrigin:3.45,startTime:3.95,tempoChanges:[{time:8.15,bpm:180}],notes:[{time:3.95,sourceTime:3.94},{time:5.15,endTime:7.15},{time:25.15}]});
 await page.locator('#undo').click();await expect(page.locator('#alignment-origin')).toHaveValue('3.400');
 await page.locator('#redo').click();await expect(page.locator('#alignment-origin')).toHaveValue('3.450');
 await page.locator('#alignment-reset').click();await expect(page.locator('#alignment-origin')).toHaveValue('3.300');
 await expect(page.locator('#save-status')).toContainText('保存しました');expect(await stored(page)).toMatchObject(chart);
 await page.locator('#alignment-origin').fill('');await page.locator('#alignment-origin').dispatchEvent('change');
 await expect(page.locator('#editor-notice')).toContainText('0〜7200秒');
 await expect(page.locator('#alignment-origin')).toHaveValue('3.300');
 await page.locator('#alignment-minus-10').click();await expect(page.locator('#save-status')).toContainText('保存しました');
 await page.reload();await expect(page.locator('#alignment-origin')).toHaveValue('3.290');
 await expect(page.locator('#alignment-first')).toContainText('3.790秒');
});
test('auditions shifted notes with zero personal timing offsets and stops after the opening section',async({page})=>{
 await page.evaluate(()=>localStorage.setItem('hey-rhythm-settings-v1',JSON.stringify({noteOffset:250,offset:200,inputOffset:200,soundDelay:250,soundVolume:70})));
 await page.reload();await expect(page.locator('#alignment-preview')).toBeEnabled();
 await page.clock.install();
 await page.evaluate(()=>{
  (window as any).alignmentSounds=[];
  const original=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){if(!this.loop)(window as any).alignmentSounds.push({when:args[0],now:this.context.currentTime,video:(window as any).testVideo.getCurrentTime()});return original.apply(this,args);};
 });
 await page.locator('#alignment-plus-100').click();await page.clock.runFor(300);
 const before=await stored(page);
 await page.locator('#alignment-preview').click();await page.clock.runFor(100);
 const start=await page.evaluate(()=>(window as any).testVideo.getCurrentTime());
 expect(start).toBeGreaterThanOrEqual(.9);expect(start).toBeLessThan(1.2);
 await page.clock.runFor(3100);
 const sounds=await page.evaluate(()=>(window as any).alignmentSounds);
 expect(sounds.length).toBeGreaterThan(0);expect(sounds[0].video).toBeCloseTo(3.9,1);
 expect(sounds[0].when-sounds[0].now).toBeLessThan(.01);
 await page.locator('#alignment-pause').click();await page.clock.runFor(100);
 expect(await page.evaluate(()=>(window as any).testVideo.state)).toBe(2);
 await page.locator('#alignment-preview').click();await page.clock.runFor(14000);
 expect(await page.evaluate(()=>(window as any).testVideo.state)).toBe(2);
 await expect(page.locator('#preview-status')).toContainText('冒頭の確認が完了');
 expect(await stored(page)).toEqual(before);
});
