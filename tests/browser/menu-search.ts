import type {Page} from '@playwright/test';
export async function searchSongs(page:Page,text:string):Promise<void>{
  if(!await page.locator('#song-search').isVisible())await page.locator('#song-search-toggle').click();
  await page.locator('#song-search').fill(text);
}
