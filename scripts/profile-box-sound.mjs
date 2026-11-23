// Input-handler CPU time with idle preparation deliberately withheld; not physical audio latency.
import {chromium} from '@playwright/test';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
for(const rate of [1,6]){
 const page=await browser.newPage();
 await page.addInitScript(()=>{window.idleTasks=[];window.requestIdleCallback=callback=>(window.idleTasks.push(callback),window.idleTasks.length);});
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:''}));
 await page.route('https://firestore.googleapis.com/**',r=>r.fulfill({status:404,body:'{}'}));
 await page.goto(`${process.argv[2] ?? 'http://127.0.0.1:5173'}/`);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate});
 console.log(await page.evaluate(async(rate)=>{
  const {TapSound}=await import('/src/sound.ts'),context=new AudioContext({latencyHint:'interactive'});
  const sound=new TapSound(()=>{},context);await sound.unlock();
  let allocations=0;const create=context.createBuffer.bind(context);context.createBuffer=(...args)=>{allocations++;return create(...args);};
  const timings=[];
  for(const label of ['cold','repeated']){const start=performance.now();sound.playBoxSweep();timings.push({label,elapsed:performance.now()-start,allocations});}
  sound.destroy();return {rate,timings};
 },rate));
 await page.close();
}
await browser.close();
