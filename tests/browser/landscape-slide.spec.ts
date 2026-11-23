import {test,expect} from '@playwright/test';
import {api} from './mock-video';

test('a single thumb slides white to red and back through an unobstructed center at both landscape sizes',async({page})=>{
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  await page.route('https://www.youtube.com/iframe_api',r=>r.fulfill({body:api}));
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:''}));
  await page.addInitScript(()=>{
    localStorage.setItem('hey-rhythm-settings-v1',JSON.stringify({sound:false,inputOffset:0}));
    localStorage.setItem('hey-rhythm-custom-chart-v1',JSON.stringify({videoId:'pJDfWpZ7CI4',title:'Cross-center slides',bpm:120,startTime:2,notes:[
      {id:1,type:'hold',gimmick:'slide',time:2,endTime:6,lane:2,path:[{time:4,lane:3}]},
      {id:2,type:'hold',gimmick:'slide',time:8,endTime:12,lane:3,path:[{time:10,lane:2}]},
    ]}));
  });
  const session=await page.context().newCDPSession(page);
  for(const [width,height] of [[568,320],[844,390]]){
    await page.setViewportSize({width,height});await page.goto('/game.html?chart=custom');
    await expect.poll(()=>page.evaluate(()=>Boolean((window as any).testVideo))).toBe(true);await page.clock.runFor(100);
    await expect(page.locator('#play-start')).toBeEnabled();
    const points=await page.locator('.lane-button').evaluateAll(nodes=>[2,3].map(lane=>{const r=nodes[lane].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}));
    const bridge={x:(points[0].x+points[1].x)/2,y:points[0].y};
    expect(await page.evaluate(p=>!document.elementFromPoint(p.x,p.y)?.closest('button,iframe'),bridge)).toBe(true);
    await page.locator('#play-start').click();await page.clock.runFor(100);
    await expect.poll(()=>page.evaluate(()=>(window as any).testVideo.getPlayerState())).toBe(1);
    const advanceTo=async(time:number)=>{const current=await page.evaluate(()=>(window as any).testVideo.getCurrentTime());await page.clock.runFor(Math.max(0,Math.round((time-current)*1000)));};
    await advanceTo(2);
    for(const [start,end] of [[0,1],[1,0]]){
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...points[start]}]});
      await page.clock.runFor(16);
      await expect(page.locator('.lane-button').nth(start===0?2:3)).toHaveClass(/holding/);
      await advanceTo(start===0?4:10);
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,...bridge}]});
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,...points[end]}]});
      await page.clock.runFor(16);
      await expect(page.locator('.lane-button').nth(end===0?2:3)).toHaveClass(/holding/);
      await advanceTo(end===1?6:12);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      if(end===1)await advanceTo(8);
    }
    await page.clock.runFor(1700);await expect(page.locator('#result')).toBeVisible();
    await expect(page.locator('#result-counts div').filter({hasText:'MISS'}).locator('strong')).toHaveText('0');
    await expect(page.locator('#result-counts div').filter({hasText:'PERFECT'}).locator('strong')).toHaveText('2');
  }
});
