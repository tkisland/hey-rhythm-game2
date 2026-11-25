import {afterEach,expect,it,vi} from 'vitest';
import {SONGS} from '../src/songs';
import {loadSongSort,saveSongSort,sortSongs,SONG_SORT_KEY} from '../src/song-sort';
const titles=(mode:Parameters<typeof sortSongs>[1])=>sortSongs(SONGS,mode).map(s=>s.title);
afterEach(()=>vi.unstubAllGlobals());
it('orders all six titles by the supplied Japanese readings without changing catalog order',()=>{
 const before=[...SONGS];
 expect(titles('title')).toEqual(['SUPER MOMMY GIRLS','Happy Go Round','ビスケットケース','PLAYFUL ROMANTIC','POJI POJI GO','夜空ウィズユー']);
 expect(SONGS).toEqual(before);
});
it('uses the supplied first release dates, not video publication or game addition order',()=>{
 expect(SONGS.map(s=>[s.reading,s.releaseDate])).toEqual([
  ['すーぱーまみーがーるず','2024-09-01'],['びすけっとけーす','2022-07-08'],
  ['ぷれいふるろまんてぃっく','2025-12-12'],['はっぴーごーらうんど','2026-09-01'],
  ['ぽじぽじごー','2025-07-29'],['よぞらうぃずゆー','2026-05-20'],
 ]);
 const oldest=['ビスケットケース','SUPER MOMMY GIRLS','POJI POJI GO','PLAYFUL ROMANTIC','夜空ウィズユー','Happy Go Round'];
 expect(titles('release-asc')).toEqual(oldest);expect(titles('release-desc')).toEqual([...oldest].reverse());
});
it('keeps unknown dates last in either direction and breaks ties by reading then stable ID',()=>{
 const base=SONGS[0];
 const songs=[{...base,id:'z',reading:undefined,title:'あ',releaseDate:undefined},{...base,id:'b',reading:'い',releaseDate:'2024-01-01'},{...base,id:'a',reading:'い',releaseDate:'2024-01-01'}];
 for(const mode of ['release-asc','release-desc'] as const)expect(sortSongs(songs,mode).map(s=>s.id)).toEqual(['a','b','z']);
 expect(sortSongs(songs,'title').map(s=>s.id)).toEqual(['z','a','b']);
});
it('restores valid preferences and defaults safely when storage is absent, corrupt or blocked',()=>{
 const data=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)});
 expect(loadSongSort()).toBe('title');saveSongSort('release-asc');expect(data.get(SONG_SORT_KEY)).toBe('release-asc');expect(loadSongSort()).toBe('release-asc');
 data.set(SONG_SORT_KEY,'popular');expect(loadSongSort()).toBe('title');
 vi.stubGlobal('localStorage',{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
 expect(loadSongSort()).toBe('title');expect(()=>saveSongSort('release-desc')).not.toThrow();
});
