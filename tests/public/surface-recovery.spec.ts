import {test,expect} from '@playwright/test';
import {api} from '../browser/mock-video';

test('resizing keeps the ordinary aligned lanes and recovers from a collapsed canvas without reloading video',async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:''}));
  await page.route('https://firestore.googleapis.com/**',r=>r.fulfill({status:404,body:'{}'}));
  await page.route('https://www.youtube.com/iframe_api',r=>r.fulfill({body:api}));
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/game.html');await expect(page.locator('#restart')).toBeEnabled();
  await page.evaluate(()=>(window as any).rotationVideo=(window as any).testVideo);
  for(const [width,height] of [[390,844],[844,390],[390,844]]){
    await page.setViewportSize({width,height});
    await expect.poll(()=>page.locator('.lane-control').evaluateAll(nodes=>nodes.every(control=>{
      const button=control.querySelector('.lane-button')!.getBoundingClientRect(),target=control.querySelector('.lane-receptor')!.getBoundingClientRect();
      return Math.abs(button.x+button.width/2-target.x-target.width/2)<.1&&target.bottom<button.top;
    }))).toBe(true);
    await expect(page.locator('.header .wordmark')).toBeVisible();
  }
  await page.locator('.stage').evaluate(n=>{n.style.display='none';});
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))));
  await page.locator('.stage').evaluate(n=>n.style.removeProperty('display'));
  await expect.poll(()=>page.locator('#game-canvas').evaluate((n:HTMLCanvasElement)=>n.width)).toBeGreaterThan(0);
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).rotationVideo===(window as any).testVideo)).toBe(true);
});
