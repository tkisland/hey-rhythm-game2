import {test,expect} from '@playwright/test';
import {SONGS} from '../../src/songs';
import {api} from '../browser/mock-video';
const thumbnail='<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#682f87"/></svg>';
test.beforeEach(async({page})=>{
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:''}));
 await page.route('https://firestore.googleapis.com/**',r=>r.fulfill({status:404,body:'{}'}));
 await page.route('https://i.ytimg.com/**',r=>r.fulfill({contentType:'image/svg+xml',body:thumbnail}));
});
test('search is opt-in, keyboard accessible and closing it restores the whole library',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#song-search')).not.toBeVisible();
 const toggle=page.getByRole('button',{name:'曲を検索',exact:true});
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 await toggle.click();await expect(page.locator('#song-search')).toBeFocused();
 await expect(page.locator('#song-search')).toHaveAttribute('placeholder','曲名を入力');
 await page.locator('#song-search').fill('夜空');await expect(page.locator('.song-card')).toHaveCount(1);
 await expect(page.locator('.song-name')).toHaveText('夜空ウィズユー');
 await page.keyboard.press('Escape');await expect(page.locator('#song-search')).not.toBeVisible();
 await expect(toggle).toBeFocused();await expect(page.locator('.song-card')).toHaveCount(SONGS.length);
 await toggle.click();await page.locator('#song-search').fill('does-not-exist');await expect(page.locator('#song-empty')).toBeVisible();
 await page.getByRole('button',{name:'検索を閉じる'}).click();await expect(page.locator('#song-empty')).not.toBeVisible();
 await expect(page.locator('#song-search')).toHaveValue('');
});
test('compact cards use video thumbnails with equal touch targets and survive missing artwork',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.song-card')).toHaveCount(SONGS.length);
 for(const song of SONGS){
  const card=page.locator(`[data-song="${song.id}"]`),img=card.locator('img');
  await expect(img).toHaveAttribute('src',`https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`);
  await expect(img).toHaveAttribute('loading','lazy');await expect(img).toHaveAttribute('alt','');
  await expect(card.locator('.song-meta')).not.toContainText('6 LANES');
 }
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const card of await page.locator('.song-card').all()){
   expect((await card.boundingBox())!.height).toBeLessThanOrEqual(175);
   for(const action of await card.locator('.song-actions > *').all())expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
 }
 const first=page.locator('.song-card').first();const before=await first.boundingBox();
 await page.route('https://i.ytimg.com/missing.jpg',r=>r.fulfill({status:404,body:''}));
 await first.locator('img').evaluate((image:HTMLImageElement)=>{image.loading='eager';image.src='https://i.ytimg.com/missing.jpg';});
 await expect(first.locator('img')).toBeHidden();await expect(first.locator('.cover-fallback')).toBeVisible();
 expect(await first.boundingBox()).toEqual(before);
 await expect(first.locator('.song-play')).toBeVisible();
});

test('sorts by reading and release date, preserves selection and filtering, and remembers the preference',async({page})=>{
 const order=()=>page.locator('.song-name').allTextContents();
 const titleOrder=['SUPER MOMMY GIRLS','Happy Go Round','ビスケットケース','PLAYFUL ROMANTIC','Hey!Yummy!','POJI POJI GO','夜空ウィズユー','LOOK!!'];
 const oldest=['ビスケットケース','SUPER MOMMY GIRLS','POJI POJI GO','PLAYFUL ROMANTIC','夜空ウィズユー','Happy Go Round'];
 await page.goto('/');await expect(page.locator('#song-sort')).toHaveValue('title');await expect.poll(order).toEqual(titleOrder);
 const smg=page.locator('[data-song="super-mommy-girls"]');await smg.locator('.song-difficulty').selectOption('easy');
 await page.locator('#song-sort').selectOption('release-asc');await expect.poll(order).toEqual([...oldest,'Hey!Yummy!','LOOK!!']);
 await expect(smg.locator('.song-difficulty')).toHaveValue('easy');await expect(smg.locator('.song-play')).toHaveCount(0);
 await page.locator('#song-search-toggle').click();await page.locator('#song-search').fill('go');
 await expect.poll(order).toEqual(['POJI POJI GO','Happy Go Round']);
 await page.locator('#song-sort').selectOption('release-desc');await expect.poll(order).toEqual(['Happy Go Round','POJI POJI GO']);
 await page.locator('#song-search').focus();await page.keyboard.press('Escape');await expect.poll(order).toEqual([...[...oldest].reverse(),'Hey!Yummy!','LOOK!!']);
 await expect(smg.locator('.song-difficulty')).toHaveValue('easy');
 await page.reload();await expect(page.locator('#song-sort')).toHaveValue('release-desc');await expect.poll(order).toEqual([...[...oldest].reverse(),'Hey!Yummy!','LOOK!!']);
 await page.setViewportSize({width:320,height:740});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const selector of ['#song-count','#song-sort','#song-search-toggle']){
  const box=(await page.locator(selector).boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(320);
 }
});

test('invalid or unavailable preference storage keeps the default usable and does not block sorting',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('hey-rhythm-song-sort-v1','unknown');
  const write=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(key==='hey-rhythm-song-sort-v1')throw new DOMException('Blocked','SecurityError');return write.call(this,key,value);};
 });
 await page.goto('/');await expect(page.locator('#song-sort')).toHaveValue('title');
 await page.locator('#song-sort').selectOption('release-desc');await expect(page.locator('.song-name').first()).toHaveText('Happy Go Round');
 await page.reload();await expect(page.locator('#song-sort')).toHaveValue('title');await expect(page.locator('.song-name').first()).toHaveText('SUPER MOMMY GIRLS');
});

test('play buttons match difficulty heights and share the game start appearance without clipping its label',async({page})=>{
 await page.route('https://www.youtube.com/iframe_api',r=>r.fulfill({body:api}));
 await page.goto('/');
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:900});
  for(const card of await page.locator('.song-card').all()){
   const play=(await card.locator('.song-play').boundingBox())!,level=(await card.locator('.song-difficulty').boundingBox())!;
   expect(play.height).toBe(level.height);expect(play.height).toBeGreaterThanOrEqual(48);
  }
 }
 const appearance=await page.locator('.song-play').first().evaluate(node=>{
  const s=getComputedStyle(node);return [s.backgroundImage,s.color,s.borderRadius,s.borderBottomColor,s.borderBottomWidth,s.boxShadow];
 });
 await page.goto('/game.html');await expect(page.locator('#restart')).toBeEnabled();
 const start=page.locator('#play-start');
 await expect.poll(()=>start.evaluate(node=>{const s=getComputedStyle(node);return [s.backgroundImage,s.color,s.borderRadius,s.borderBottomColor,s.borderBottomWidth,s.boxShadow];})).toEqual(appearance);
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:900});await expect(start).toBeVisible();
  expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  expect(await start.evaluate(node=>node.scrollHeight<=node.clientHeight && node.scrollWidth<=node.clientWidth)).toBe(true);
 }
 await start.click();await expect(start).toHaveAttribute('aria-label','ノーツ音を有効にする');
 await page.evaluate(()=>(window as any).testVideo.pauseVideo());
 await expect(start).toHaveText('ゲーム再開');await expect(start.locator('span')).toHaveText(['ゲーム','再開']);
});

test('daily song changes at JST midnight while the menu stays open', async ({page}) => {
  await page.clock.install({time:new Date('2026-11-26T23:59:57+09:00')});
  await page.clock.pauseAt(new Date('2026-11-26T23:59:58+09:00'));
  await page.goto('/');
  const daily=page.locator('#daily-song');
  await expect(daily).toHaveAttribute('href','./game.html?song=super-mommy-girls');
  await expect(daily).toContainText('SUPER MOMMY GIRLS');
  await expect(daily.locator('img')).toHaveAttribute('src',/pJDfWpZ7CI4/);
  await page.locator('#song-sort').selectOption('release-asc');
  await expect(daily).toHaveAttribute('href','./game.html?song=super-mommy-girls');
  await page.clock.runFor(2100);
  await expect(daily).toHaveAttribute('href','./game.html?song=biscuit-case');
  await expect(daily).toContainText('ビスケットケース');
});

test('random play uses the public library beyond search and avoids the previous pick', async ({page}) => {
  await page.route('https://www.youtube.com/iframe_api',route=>route.fulfill({body:api}));
  await page.addInitScript(()=>{ if(!location.pathname.endsWith('game.html'))Math.random=()=>0; });
  await page.goto('/');
  await page.getByRole('button',{name:'曲を検索'}).click();
  await page.getByRole('searchbox',{name:'曲名で検索'}).fill('見つからない曲');
  await expect(page.locator('.song-card')).toHaveCount(0);
  await page.getByRole('button',{name:/ランダム/}).click();
  await expect(page).toHaveURL(/game\.html\?song=super-mommy-girls$/);
  await expect(page.locator('#play-start')).toBeEnabled();
  await expect.poll(()=>page.evaluate(()=>(window as any).testVideo.getPlayerState())).not.toBe(1);
  await page.goto('/');
  await page.getByRole('button',{name:/ランダム/}).click();
  await expect(page).toHaveURL(/game\.html\?song=biscuit-case$/);
});
