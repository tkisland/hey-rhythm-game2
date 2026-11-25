import type {Song} from './songs';
export type SongSort = 'title' | 'release-desc' | 'release-asc';
export const SONG_SORT_KEY = 'hey-rhythm-song-sort-v1';
const collator = new Intl.Collator('ja', {numeric:true});
export function isSongSort(value:unknown): value is SongSort {
  return value === 'title' || value === 'release-desc' || value === 'release-asc';
}
export function loadSongSort():SongSort {
  try { const value=localStorage.getItem(SONG_SORT_KEY); return isSongSort(value)?value:'title'; }
  catch { return 'title'; }
}
export function saveSongSort(value:SongSort):void {
  try { localStorage.setItem(SONG_SORT_KEY,value); } catch { /* Sorting still works for this visit. */ }
}
export function sortSongs(songs:readonly Song[],sort:SongSort):Song[] {
  return [...songs].sort((a,b)=>{
    if(sort!=='title'){
      // Unknown dates stay last in either direction; YYYY-MM-DD compares chronologically.
      if(!a.releaseDate && b.releaseDate)return 1;
      if(a.releaseDate && !b.releaseDate)return -1;
      if(a.releaseDate && b.releaseDate && a.releaseDate!==b.releaseDate){
        const order=a.releaseDate<b.releaseDate?-1:1;
        return sort==='release-asc'?order:-order;
      }
    }
    return collator.compare((a.reading??a.title).normalize('NFKC'),(b.reading??b.title).normalize('NFKC')) || (a.id<b.id?-1:a.id>b.id?1:0);
  });
}
