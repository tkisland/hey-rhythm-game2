import {test,expect} from '@playwright/test';
import {SONGS} from '../../src/songs';
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
