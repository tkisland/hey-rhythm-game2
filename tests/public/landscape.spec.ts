import {test,expect} from '@playwright/test';
import {api,seekPlay} from '../browser/mock-video';

test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:''}));
  await page.route('https://firestore.googleapis.com/**',r=>r.fulfill({status:404,body:'{}'}));
  await page.route('https://www.youtube.com/iframe_api',r=>r.fulfill({body:api}));
  await page.addInitScript(()=>localStorage.setItem('hey-rhythm-settings-v1',JSON.stringify({sound:false})));
  await page.goto('/game.html');await expect(page.locator('#restart')).toBeEnabled();
});

test('centers the live monitor between equal three-lane wings while all controls remain reachable',async({page})=>{
  for(const [width,height] of [[568,320],[640,360],[844,390],[932,430],[1024,560]]){
    await page.setViewportSize({width,height});
    await expect.poll(()=>page.evaluate(()=>{
      const iframe=document.querySelector('iframe')!,video=iframe.getBoundingClientRect(),canvas=document.querySelector('#game-canvas')!,field=canvas.getBoundingClientRect();
      const pads=[...document.querySelectorAll('.lane-button')].map(n=>n.getBoundingClientRect());
      const controls=[...document.querySelectorAll('.lane-button'),document.querySelector('#play-start')!,document.querySelector('#settings-toggle')!,document.querySelector('.playback-details summary')!];
      return getComputedStyle(canvas).getPropertyValue('--split-stage').trim()==='1'&&Math.abs(video.x+video.width/2-field.x-field.width/2)<.5&&video.width>=200&&video.height>=200&&
        [[1,1],[199,1],[1,199],[199,199],[100,100]].every(([x,y])=>document.elementFromPoint(video.x+x,video.y+y)===iframe)&&
        pads.every((p,lane)=>p.width>=44&&Math.abs(p.width-pads[0].width)<.1&&p.height>=60&&p.bottom<=innerHeight-43.9&&(lane<3?p.right<video.left:p.left>video.right))&&
        controls.every(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top>=0&&r.bottom<=innerHeight&&(hit===n||n.contains(hit));})&&document.documentElement.scrollWidth<=innerWidth;
    })).toBe(true);
  }
});

test('rotation preserves the same video and pause position, and two thumbs use both wings without shifting the field',async({page})=>{
  await page.setViewportSize({width:390,height:844});await seekPlay(page,12);
  await page.evaluate(()=>{(window as any).rotationVideo=(window as any).testVideo;(window as any).testVideo.pauseVideo();});
  const score=await page.locator('#score').innerText();
  await page.setViewportSize({width:844,height:390});
  await expect.poll(()=>page.locator('#game-canvas').evaluate(n=>getComputedStyle(n).getPropertyValue('--split-stage').trim())).toBe('1');
  expect(await page.evaluate(()=>(window as any).rotationVideo===(window as any).testVideo)).toBe(true);
  expect(await page.evaluate(()=>(window as any).testVideo.getCurrentTime())).toBeCloseTo(12,1);
  const field=await page.locator('#game-canvas').boundingBox(),video=await page.locator('iframe').boundingBox();
  const contacts=await page.locator('.lane-button').evaluateAll(nodes=>[0,5].map(lane=>{const r=nodes[lane].getBoundingClientRect();return {id:lane+1,x:r.x+r.width/2,y:r.y+r.height/2};}));
  const session=await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:contacts});await expect(page.locator('.lane-button.pressed')).toHaveCount(2);
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.locator('.lane-button.pressed')).toHaveCount(0);
  expect(await page.locator('#game-canvas').boundingBox()).toEqual(field);expect(await page.locator('iframe').boundingBox()).toEqual(video);
  await page.locator('.playback-details summary').click();await expect(page.locator('.playback-info a')).toBeVisible();await page.locator('.playback-details summary').click();
  await page.locator('#settings-toggle').click();await expect(page.locator('#settings-panel')).toBeVisible();await page.locator('#settings-close').click();
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.locator('#game-canvas').evaluate(n=>getComputedStyle(n).getPropertyValue('--split-stage').trim())).not.toBe('1');
  expect(await page.evaluate(()=>(window as any).rotationVideo===(window as any).testVideo)).toBe(true);await expect(page.locator('#score')).toHaveText(score);
  const monitor=(await page.locator('iframe').boundingBox())!,runway=(await page.locator('#game-canvas').boundingBox())!;
  expect(monitor.y+monitor.height).toBeLessThanOrEqual(runway.y);
});

test('recovers from a temporarily collapsed surface without canvas errors or reloading the video',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>(window as any).rotationVideo=(window as any).testVideo);
  await page.locator('.stage').evaluate(n=>{n.style.display='none';});
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))));
  await page.locator('.stage').evaluate(n=>n.style.removeProperty('display'));
  await expect.poll(()=>page.locator('#game-canvas').evaluate((n:HTMLCanvasElement)=>n.width)).toBeGreaterThan(0);
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).rotationVideo===(window as any).testVideo)).toBe(true);
  await expect(page.locator('.lane-button').first()).toBeVisible();
});
