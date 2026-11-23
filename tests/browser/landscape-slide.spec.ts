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


test('rendered landscape heads follow the curved lanes and hit the centers of the six actual buttons',async({page})=>{
  await page.route('https://www.youtube.com/iframe_api',r=>r.fulfill({body:api}));
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:''}));
  for(const [width,height] of [[568,320],[844,390],[1024,560]]){
    await page.setViewportSize({width,height});await page.goto('/game.html?chart=test');await expect(page.locator('#restart')).toBeEnabled();
    const results=await page.locator('#game-canvas').evaluate(async(base:HTMLCanvasElement)=>{
      const {Renderer}=await import('/src/renderer.ts'),{canvasGeometry,project}=await import('/src/field-geometry.ts'),{GameEngine}=await import('/src/engine.ts');
      const rect=base.getBoundingClientRect(),canvas=document.createElement('canvas');
      canvas.style.cssText=`position:fixed;left:${rect.x}px;top:${rect.y}px;width:${rect.width}px;height:${rect.height}px;opacity:0;pointer-events:none;--split-stage:1`;
      canvas.dataset.stageHeight=base.dataset.stageHeight;document.body.append(canvas);
      const renderer=new Renderer(canvas),ctx=canvas.getContext('2d')!,round=ctx.roundRect.bind(ctx),field=canvasGeometry(canvas);
      const engine=new GameEngine({videoId:'pJDfWpZ7CI4',title:'Arc test',bpm:120,startTime:12,notes:Array.from({length:6},(_,lane)=>({id:lane+1,lane,type:'tap' as const,time:12}))});
      const pads=[...document.querySelectorAll('.lane-button')].map(n=>{const r=n.getBoundingClientRect();return {x:r.x+r.width/2-rect.x,y:r.y+r.height/2-rect.y};});
      const video=document.querySelector('iframe')!.getBoundingClientRect(),results=[];
      let heads:{x:number;y:number;width:number;height:number}[]=[];
      ctx.roundRect=(...args)=>{heads.push({x:args[0]+args[2]/2,y:args[1]+args[3]/2,width:args[2],height:args[3]});return round(...args);};
      try{
        for(const progress of [0,.15,.4,.65,.8,.95,1]){
          heads=[];renderer.draw(engine.notes,12+(progress-1)*2.5,2.5,0,{playing:false});
          results.push({progress,heads:heads.map((head,lane)=>({head,expected:project(field,lane,progress),pad:pads[lane],video:{left:video.left-rect.left,right:video.right-rect.left,bottom:video.bottom-rect.top}}))});
        }
        // Curved hold ribbons must not take a straight shortcut through the monitor.
        const move=ctx.moveTo.bind(ctx),line=ctx.lineTo.bind(ctx),fill=ctx.fill.bind(ctx);
        let path:{x:number;y:number}[]=[],curvedHold=false;
        ctx.moveTo=(x,y)=>{path=[{x,y}];return move(x,y);};
        ctx.lineTo=(x,y)=>{path.push({x,y});return line(x,y);};
        ctx.fill=((...args:any[])=>{
          if(ctx.fillStyle instanceof CanvasGradient&&path.length>8)curvedHold=true;
          return (fill as any)(...args);
        }) as typeof ctx.fill;
        const hold=new GameEngine({videoId:'pJDfWpZ7CI4',title:'Curved hold',bpm:120,startTime:12,notes:[{id:1,lane:2,type:'hold',time:12,endTime:14}]});
        renderer.draw(hold.notes,12,2.5,0,{playing:false});
        if(!curvedHold)throw new Error('Long hold did not follow the sampled curved lane');
      }finally{renderer.destroy();canvas.remove();}
      return results;
    });
    for(const frame of results){
      expect(frame.heads).toHaveLength(6);
      for(const {head,expected,pad,video} of frame.heads){
        expect(head.x).toBeCloseTo(expected.x,5);expect(head.y).toBeCloseTo(expected.y,5);
        expect(head.y-head.height/2>=video.bottom||head.x+head.width/2<=video.left||head.x-head.width/2>=video.right).toBe(true);
        if(frame.progress===1){expect(head.x).toBeCloseTo(pad.x,1);expect(head.y).toBeCloseTo(pad.y,1);}
      }
    }
  }
});
