import {test,expect} from '@playwright/test';
import {api} from '../browser/mock-video';
import {SONGS} from '../../src/songs';
import {loadEnv} from 'vite';
import {parseCloudConfig} from '../../src/cloud-schema';
const configured=Boolean(parseCloudConfig(loadEnv('pages',process.cwd(),'').VITE_FIREBASE_CONFIG));

test.beforeEach(async({page})=>{
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  await page.route('https://firestore.googleapis.com/**',r=>r.fulfill({status:404,body:'{}'}));
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:''}));
  await page.route('https://www.youtube.com/iframe_api',r=>r.fulfill({body:api}));
  await page.addInitScript(()=>localStorage.setItem('hey-rhythm-settings-v1',JSON.stringify({sound:false})));
});

test('plays every bundled song beneath the Pages path without PHP requests',async({page,request})=>{
  const backend:string[]=[],errors:string[]=[];
  page.on('request',r=>{if(/\.php(?:\?|$)|identitytoolkit\.googleapis|securetoken\.googleapis/.test(r.url()))backend.push(r.url());});
  page.on('pageerror',e=>errors.push(e.message));
  for(const song of SONGS){
    await page.goto('./');await expect(page.locator('#pages-preview-notice')).toContainText('テストプレイ環境');
    await expect(page.locator('.song-card')).toHaveCount(SONGS.length);
    await page.locator(`[data-song="${song.id}"] .song-play`).click();
    await expect(page).toHaveURL(new RegExp(`/hey-rtm-game/game.html\\?song=${song.id}$`));
    await expect.poll(()=>page.evaluate(()=>Boolean((window as any).testVideo))).toBe(true);
    await page.clock.runFor(100);
    await expect(page.locator('#play-start')).toBeEnabled();
    expect(await page.evaluate(()=>(window as any).testVideo.options.videoId)).toBe(song.videoId);
    await page.locator('#play-start').click();await page.clock.runFor(100);
    await expect(page.locator('#player-status')).toContainText('MVと同期してプレイ中');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.lane-button')].every(button=>{const bounds=button.getBoundingClientRect();return bounds.top>=0&&bounds.bottom<=innerHeight;}))).toBe(true);
  }
  await page.goto('./rankings.html');await expect(page.locator('#ranking-page-status')).toContainText('テスト環境ではランキングを利用できません');
  expect(backend).toEqual([]);expect(errors).toEqual([]);
  for(const file of ['api/ranking.php','share.php','api/catalog.json','.vite/manifest.json'])expect((await request.get(file)).status()).toBe(404);
  const html=await (await request.get('./')).text();expect(html).toContain('noindex, nofollow');
});

test('finishes a normal play with a result and no ranking or sharing controls',async({page})=>{
  const backend:string[]=[];page.on('request',r=>{if(/\.php(?:\?|$)|identitytoolkit\.googleapis|securetoken\.googleapis/.test(r.url()))backend.push(r.url());});
  await page.goto('./game.html?song=playful-romantic');
  await expect.poll(()=>page.evaluate(()=>Boolean((window as any).testVideo))).toBe(true);await page.clock.runFor(100);
  await expect(page.locator('#play-start')).toBeEnabled();
  await page.locator('#play-start').click();await page.clock.runFor(100);
  for(let second=0;second<212;second++)await page.clock.fastForward(1000);
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#result-ranking')).toBeHidden();await expect(page.locator('#result-share')).toBeHidden();
  expect(backend).toEqual([]);
  await page.getByRole('button',{name:'もういちど遊ぶ',exact:true}).click();await page.clock.runFor(100);
  await expect(page.locator('#result')).toBeHidden();
});

test('opens and completes the sample play from the song card',async({page})=>{
  await page.goto('./');await page.locator('[data-song="playful-romantic"] .song-demo').click();
  await expect.poll(()=>page.evaluate(()=>Boolean((window as any).testVideo))).toBe(true);await page.clock.runFor(100);
  await expect(page.locator('#demo-badge')).toBeVisible();await page.locator('#play-start').click();
  for(let second=0;second<212;second++)await page.clock.fastForward(1000);
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#result-counts div').filter({hasText:'PERFECT'}).locator('strong')).toHaveText('539');
  await expect(page.locator('#result-ranking')).toBeHidden();await expect(page.locator('#result-share')).toBeHidden();
});

test('exposes configured Google login without loading the editor before authorization',async({page})=>{
  const editorRequests:string[]=[];
  page.on('request',r=>{if(r.url().includes('editor-controller'))editorRequests.push(r.url());});
  await page.goto('./admin.html');await page.clock.runFor(100);
  await expect(page.locator('#pages-admin-warning')).toContainText('本番のオンライン譜面にも反映');
  await expect(page.locator('a[href="https://hey.jpn.org/rhythm/moderation.html"]')).toHaveText('本番のランキング管理');
  if(configured){
    await expect(page.locator('#google-login')).toBeEnabled();
    await expect(page.locator('#login-status')).toHaveText('Googleでログインしてください。');
  }else{
    await expect(page.locator('#google-login')).toBeDisabled();
    await expect(page.locator('#login-status')).toContainText('準備中');
  }
  await expect(page.locator('#admin-tools')).toBeHidden();await expect(page.locator('#record-toggle')).toHaveCount(0);
  expect(editorRequests).toEqual([]);
});

test('reads a published online chart on Pages when Firebase is configured',async({page})=>{
  test.skip(!configured,'No Firebase Web configuration in this build.');
  const chart={videoId:'pJDfWpZ7CI4',title:'Pages published test',bpm:120,startTime:12,notes:[{id:1,lane:0,type:'tap',time:12}]};
  const fields={schemaVersion:{integerValue:'1'},songId:{stringValue:'super-mommy-girls'},videoId:{stringValue:chart.videoId},revision:{integerValue:'1'},noteCount:{integerValue:'1'},json:{stringValue:JSON.stringify(chart)}};
  await page.route('https://firestore.googleapis.com/**/publishedCharts/super-mommy-girls?*',r=>r.fulfill({json:{fields}}));
  await page.goto('./game.html');await expect.poll(()=>page.evaluate(()=>Boolean((window as any).testVideo))).toBe(true);await page.clock.runFor(100);
  await expect(page.locator('#chart-info')).toHaveText('120 BPM · 1 NOTES');
});

test('diagnoses an older online POJI chart and bypasses it only in explicit bundled comparison mode',async({page})=>{
  test.skip(!configured,'No Firebase Web configuration in this build.');
  const chart={videoId:'F0bagOeDMFc',title:'POJI POJI GO',bpm:195.000195,beatOrigin:3.3,startTime:3.915384,notes:[{id:1,lane:0,type:'tap',time:3.915384}]};
  const fields={schemaVersion:{integerValue:'1'},songId:{stringValue:'poji-poji-go'},videoId:{stringValue:chart.videoId},revision:{integerValue:'7'},noteCount:{integerValue:'1'},json:{stringValue:JSON.stringify(chart)}};
  let reads=0;
  await page.route('https://firestore.googleapis.com/**/publishedCharts/poji-poji-go?*',r=>{reads++;return r.fulfill({json:{fields}});});
  // A bare bundled parameter must not silently override normal publication.
  await page.goto('./game.html?song=poji-poji-go&bundled=1');
  await expect.poll(()=>page.evaluate(()=>Boolean((window as any).testVideo))).toBe(true);await page.clock.runFor(100);
  await expect(page.locator('#chart-info')).toHaveText('195 BPM · 1 NOTES');
  await expect(page.locator('.sync-diagnostics')).toHaveCount(0);
  await page.goto('./game.html?song=poji-poji-go&sync=1');
  await expect.poll(()=>page.evaluate(()=>Boolean((window as any).testVideo))).toBe(true);await page.clock.runFor(100);
  await expect(page.locator('[data-chart-active]')).toContainText('オンライン公開（改訂7）');
  await expect(page.locator('[data-chart-active]')).toContainText('拍の基準 3.300秒 / 最初のノーツ 3.915秒');
  await expect(page.locator('[data-chart-bundled]')).toContainText('拍の基準 3.920秒 / 最初のノーツ 4.535秒');
  await expect(page.locator('[data-chart-warning]')).toContainText('最初のノーツ時刻が異なります');
  const before=reads;
  await page.locator('[data-chart-compare]').click();
  await expect.poll(()=>page.evaluate(()=>Boolean((window as any).testVideo))).toBe(true);await page.clock.runFor(100);
  await expect(page.locator('#chart-info')).toHaveText('195 BPM · 776 NOTES');
  await expect(page.locator('[data-chart-active]')).toContainText('拍の基準 3.920秒 / 最初のノーツ 4.535秒');
  expect(reads).toBe(before);
  await page.locator('[data-chart-compare]').click();
  await expect.poll(()=>page.evaluate(()=>Boolean((window as any).testVideo))).toBe(true);await page.clock.runFor(100);
  await expect(page.locator('[data-chart-active]')).toContainText('オンライン公開（改訂7）');
  expect(reads).toBe(before+1);
  // Legacy charts use the first note as their grid origin; this does not shift notes.
  fields.json.stringValue=JSON.stringify({...chart,beatOrigin:undefined,startTime:4.535384,notes:[{id:1,lane:0,type:'tap',time:4.535384}]});
  await page.reload();await expect.poll(()=>page.evaluate(()=>Boolean((window as any).testVideo))).toBe(true);await page.clock.runFor(100);
  await expect(page.locator('[data-chart-active]')).toContainText('拍の基準 4.535秒 / 最初のノーツ 4.535秒');
  await expect(page.locator('[data-chart-warning]')).toHaveText('');
});
