import {test,expect} from '@playwright/test';

test('a cold and repeated box sound start without waveform synthesis or decoding in the input handler',async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:''}));
  await page.route('https://firestore.googleapis.com/**',r=>r.fulfill({status:404,body:'{}'}));
  await page.addInitScript(()=>{
    localStorage.setItem('hey-rhythm-onboarding-v1',JSON.stringify({seen:true,tutorial:true,timing:true}));
    // Deliberately leave idle preparation pending, as on a busy page.
    (window as any).idleAudioTasks=[];
    window.requestIdleCallback=callback=>{(window as any).idleAudioTasks.push(callback);return (window as any).idleAudioTasks.length;};
  });
  await page.goto('/');
  await page.evaluate(async()=>{
    const {TapSound}=await import('/src/sound.ts'),sound=new TapSound(()=>{});
    (window as any).boxSound=sound;(window as any).boxAudioReports=[];
    const prime=document.createElement('button');prime.id='prime-box-audio';prime.textContent='Prepare audio';
    prime.addEventListener('click',()=>{void sound.unlock();});
    const play=document.createElement('button');play.id='test-box-audio';play.textContent='Play box';
    play.addEventListener('click',()=>{
      const sin=Math.sin,exp=Math.exp,decode=window.atob,create=AudioContext.prototype.createBuffer,start=AudioBufferSourceNode.prototype.start;
      let sineCalls=0,exponentialCalls=0,decodeCalls=0,buffers=0;
      const starts:{when:number;now:number;duration:number}[]=[];
      Math.sin=x=>{sineCalls++;return sin(x);};Math.exp=x=>{exponentialCalls++;return exp(x);};
      window.atob=data=>{decodeCalls++;return decode(data);};
      AudioContext.prototype.createBuffer=function(...args){buffers++;return create.apply(this,args);};
      AudioBufferSourceNode.prototype.start=function(...args){starts.push({when:args[0]??0,now:this.context.currentTime,duration:this.buffer!.duration});return start.apply(this,args);};
      try{sound.playBoxSweep();}finally{
        Math.sin=sin;Math.exp=exp;window.atob=decode;AudioContext.prototype.createBuffer=create;AudioBufferSourceNode.prototype.start=start;
      }
      (window as any).boxAudioReports.push({sineCalls,exponentialCalls,decodeCalls,buffers,starts});
    });
    document.querySelector('#app')!.prepend(prime,play);
  });
  await page.locator('#prime-box-audio').click();
  await expect.poll(()=>page.evaluate(()=>(window as any).boxSound.diagnostics().state)).toBe('running');
  await page.locator('#test-box-audio').click();await page.locator('#test-box-audio').click();
  const reports=await page.evaluate(()=>(window as any).boxAudioReports);
  expect(reports).toHaveLength(2);
  for(const report of reports){
    expect(report.sineCalls).toBe(0);expect(report.exponentialCalls).toBe(0);expect(report.decodeCalls).toBe(0);
    expect(report.starts).toHaveLength(1);expect(report.starts[0].duration).toBeCloseTo(.45,3);
    expect(report.starts[0].when).toBeLessThanOrEqual(report.starts[0].now+.001);
  }
  expect(reports.map((r:any)=>r.buffers)).toEqual([1,0]);
  await page.evaluate(()=>(window as any).boxSound.destroy());
});
