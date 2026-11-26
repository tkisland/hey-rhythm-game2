import './style.css';
import './menu.css';
import './play-button.css';
import {isSongSort,loadSongSort,saveSongSort,sortSongs} from './song-sort';
import { dailySong, nextJapanDay, randomSong } from './song-spotlight';
import { CUSTOM_CHART_KEY, EDITOR_KEY, loadChart, storeChart } from './editor-model';
import { findSong, isPublicDifficulty, SONGS, songStorageKey, songUrl } from './songs';
import type { Song } from './songs';
import { bundledChart } from './bundled-charts';
import { tempoLabel } from './tempo';
import { publishedChart } from './cloud-published';
import type { Chart } from './chart';
import { mountTutorial } from './tutorial';
import { playableNotes } from './note-display';
import {mountOnboarding} from './onboarding';
import {loadOnboarding,updateOnboarding} from './onboarding-state';
import { mountMenuSettings } from './menu-settings';
import {DIFFICULTIES,DEFAULT_DIFFICULTY,findDifficulty} from './difficulties';
import type {Difficulty} from './difficulties';

const list = document.getElementById('song-list')!;
const search = document.getElementById('song-search') as HTMLInputElement;
const searchToggle = document.getElementById('song-search-toggle') as HTMLButtonElement;
const searchPanel = document.getElementById('song-search-panel')!;
const sortSelect = document.getElementById('song-sort') as HTMLSelectElement;
let sort = loadSongSort();
sortSelect.value = sort;
const notice = document.getElementById('menu-notice')!;
const listeners = new AbortController();
const menuSettings = mountMenuSettings();
const disposeTutorial = mountTutorial(__ADMIN__ ? {} : {
  onComplete() { if(!loadOnboarding().tutorial)updateOnboarding({tutorial:true}); },
  continueLabel: () => loadOnboarding().timing ? '選曲に戻る' : 'タイミングをチェック',
  onContinue() { if(!loadOnboarding().timing)menuSettings.openTiming(); },
});
const disposeOnboarding = __ADMIN__ ? () => {} : mountOnboarding({
  tutorial() { document.getElementById('open-tutorial')!.click(); },
  timing() { menuSettings.openTiming(); },
});
const online = new Map<string, Chart>();
const selected = new Map<string,Difficulty>();
const chartKey = (song:Song,difficulty:Difficulty) => `${song.id}:${difficulty}`;
const savedChart = (song: Song,difficulty:Difficulty) => loadChart(songStorageKey(EDITOR_KEY, song,difficulty), true, song) ?? loadChart(songStorageKey(CUSTOM_CHART_KEY, song,difficulty), true, song);
function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
}
function songArt(song: Song): HTMLElement {
  const artwork = node('div', 'song-art'); artwork.setAttribute('aria-hidden', 'true');
  artwork.append(node('span', 'cover-fallback', '♪'));
  const thumbnail = node('img', 'song-thumbnail');
  thumbnail.alt = ''; thumbnail.width = 320; thumbnail.height = 180;
  thumbnail.loading = 'lazy'; thumbnail.decoding = 'async';
  thumbnail.addEventListener('error', () => { thumbnail.hidden = true; }, {once:true});
  thumbnail.src = `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`;
  artwork.append(thumbnail);
  return artwork;
}
function showNotice(text: string): void { notice.textContent = text; notice.hidden = false; }
function render(): void {
  const focused = document.activeElement instanceof HTMLSelectElement ? document.activeElement.id : null;
  const query = search.value.trim().toLocaleLowerCase();
  const songs = sortSongs(SONGS.filter(song => `${song.title} ${song.artist}`.toLocaleLowerCase().includes(query)),sort);
  list.replaceChildren();
  document.getElementById('song-count')!.textContent = `${songs.length}曲 / 全${SONGS.length}曲`;
  document.getElementById('song-empty')!.hidden = songs.length > 0;
  songs.forEach(song => {
    const difficulty=selected.get(song.id) ?? DEFAULT_DIFFICULTY;
    const saved = __ADMIN__ ? savedChart(song,difficulty) : null, bundled = (__ADMIN__ || isPublicDifficulty(song,difficulty)) ? online.get(chartKey(song,difficulty)) ?? bundledChart(song,difficulty) : null, card = node('article', 'song-card'); card.dataset.song = song.id;
    const artwork = songArt(song);
    const body = node('div', 'song-card-body');
    body.append(node('p', 'song-artist', song.artist), node('h2', 'song-name', song.title), node('p', 'song-meta', bundled ? `${__ADMIN__ ? `${(song.charts?.[difficulty] ?? song.chartId)?.toUpperCase()} · ` : ''}${tempoLabel(bundled)} BPM · ${playableNotes(bundled.notes).length} NOTES` : __ADMIN__ ? `練習譜面 ${song.bpm} BPM` : '譜面の準備中'));
    const levelLabel=node('label','difficulty-choice'), level=node('select','song-difficulty');level.id=`difficulty-${song.id}`;
    level.setAttribute('aria-label',`${song.title}の難易度`);
    for(const item of DIFFICULTIES){
      const available=isPublicDifficulty(song,item.id) && (online.has(chartKey(song,item.id)) || !!bundledChart(song,item.id));
      const option=node('option','',`${item.label}${available || __ADMIN__ ? '' : '（準備中）'}`);option.value=item.id;level.append(option);
    }
    level.value=difficulty;
    level.addEventListener('change',()=>{const next=findDifficulty(level.value);if(next){selected.set(song.id,next);render();}});
    levelLabel.append(level);
    if (__ADMIN__) body.append(node('p', 'saved-summary', saved ? `保存譜面あり · ${playableNotes(saved.notes).length} NOTES` : '管理者の下書きはまだありません。編集から作成できます。'));
    const actions = node('div', 'song-actions');
    if(!__ADMIN__)actions.classList.add('player-difficulty-actions');
    actions.append(levelLabel);
    if (bundled || __ADMIN__) {
      const play = node('a', 'song-play primary-play', __ADMIN__ ? bundled ? '収録譜面で遊ぶ' : '練習譜面で遊ぶ' : 'プレイ');
      play.href = __ADMIN__ ? songUrl(song, 'game', bundled ? 'bundled' : 'test',difficulty) : songUrl(song, 'game',false,difficulty);
      actions.append(play);
      if(!__ADMIN__){
        const demo=node('a','song-demo','見本プレイ');
        demo.href=`${songUrl(song,'game',false,difficulty)}&mode=demo`;actions.append(demo);
      }
    } else actions.append(node('span', 'song-unavailable', '準備中'));
    if (__ADMIN__) {
      const custom = node('button', 'song-saved', '保存譜面で遊ぶ'); custom.type = 'button'; custom.disabled = !saved;
      custom.addEventListener('click', () => {
        const latest = savedChart(song,difficulty);
        if (!latest) { showNotice('保存譜面を読み込めませんでした。「譜面を編集」から確認してください。'); render(); return; }
        if (!storeChart(songStorageKey(CUSTOM_CHART_KEY, song,difficulty), latest)) { showNotice('試遊用の譜面を保存できません。ブラウザの保存設定を確認するか、譜面エディターでJSONを書き出してください。'); return; }
        location.href = songUrl(song, 'game', true,difficulty);
      });
      const edit = node('a', 'song-edit', '譜面を編集 →'); edit.href = songUrl(song, 'editor',false,difficulty);
      actions.append(custom, edit);
      if (bundled) { const practice = node('a', 'song-practice', '練習譜面で遊ぶ'); practice.href = songUrl(song, 'game', 'test',difficulty); actions.append(practice); }
    }
    card.append(artwork, body, actions); list.append(card);
  });
  if(focused)document.getElementById(focused)?.focus({preventScroll:true});
}
function mountSongSpotlight(): () => void {
  const section = document.getElementById('song-spotlight')!;
  const random = document.querySelector<HTMLButtonElement>('#random-song')!;
  const daily = document.querySelector<HTMLAnchorElement>('#daily-song')!;
  const title = document.getElementById('daily-song-title')!;
  const storageKey = 'hey-rhythm-last-random-song-v1';
  let previous: string | null = null, dailyId: string | undefined, midnightTimer = 0;
  try { previous = sessionStorage.getItem(storageKey); } catch { /* The menu works with storage disabled. */ }
  const available = () => SONGS.filter(song => isPublicDifficulty(song, DEFAULT_DIFFICULTY)
    && (online.has(chartKey(song, DEFAULT_DIFFICULTY)) || bundledChart(song, DEFAULT_DIFFICULTY)));
  const refresh = () => {
    const songs = available(), now = Date.now(), today = dailySong(songs, now);
    random.hidden = !songs.length;
    daily.hidden = !today;
    section.hidden = random.hidden && daily.hidden;
    if (today && today.id !== dailyId) {
      daily.querySelector('.song-art')?.remove();
      daily.prepend(songArt(today));
      daily.href = songUrl(today, 'game');
      title.textContent = today.title;
    }
    dailyId = today?.id;
    clearTimeout(midnightTimer);
    midnightTimer = window.setTimeout(refresh, nextJapanDay(now) - now);
  };
  random.addEventListener('click', () => {
    const song = randomSong(available(), previous);
    if (!song) return;
    previous = song.id;
    try { sessionStorage.setItem(storageKey, song.id); } catch { /* Selection still works. */ }
    location.assign(songUrl(song, 'game'));
  }, { signal: listeners.signal });
  window.addEventListener('pageshow', refresh, { signal: listeners.signal });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); }, { signal: listeners.signal });
  listeners.signal.addEventListener('abort', () => clearTimeout(midnightTimer), { once: true });
  refresh();
  return refresh;
}
const refreshSpotlight = __ADMIN__ ? null : mountSongSpotlight();

const params = new URLSearchParams(location.search), legacy = params.get('chart');
if (params.has('missing-song')) showNotice('指定された曲が見つかりませんでした。楽曲一覧から選び直してください。');
if (params.has('missing-difficulty')) showNotice('指定された難易度が見つかりませんでした。難易度を選び直してください。');
if (params.has('unavailable-song')) showNotice('この曲の譜面は準備中です。ほかの曲を選んでください。');
if (legacy === 'custom' || legacy === 'test' || legacy === 'bundled') {
  const song = findSong(params.get('song'));
  const difficulty=findDifficulty(params.get('difficulty'));
  if (song && difficulty) location.replace(__ADMIN__ ? songUrl(song, 'game', legacy === 'custom' ? true : legacy,difficulty) : songUrl(song, 'game',false,difficulty));
  else showNotice('指定された曲が見つかりませんでした。楽曲一覧から選び直してください。');
}
function setSearchOpen(open: boolean): void {
  searchPanel.hidden = !open;
  searchToggle.setAttribute('aria-expanded', String(open));
  searchToggle.setAttribute('aria-label', open ? '検索を閉じる' : '曲を検索');
  if (open) search.focus();
  else { search.value = ''; render(); searchToggle.focus(); }
}
searchToggle.addEventListener('click', () => setSearchOpen(searchPanel.hidden), {signal:listeners.signal});
search.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); setSearchOpen(false); }
}, {signal:listeners.signal});
sortSelect.addEventListener('change', () => {
  if (isSongSort(sortSelect.value)) { sort = sortSelect.value; saveSongSort(sort); render(); }
}, {signal:listeners.signal});
search.addEventListener('input', render, { signal: listeners.signal });
window.addEventListener('pageshow', render, { signal: listeners.signal });
render();
if (!__ADMIN__) void Promise.all(SONGS.flatMap(song => DIFFICULTIES.map(async difficulty => {
  if(!isPublicDifficulty(song,difficulty.id))return;
  try { const published = await publishedChart(song,difficulty.id); if (published) online.set(chartKey(song,difficulty.id), published.chart); }
  catch { /* The game reports a failed chart request without playing stale data. */ }
}))).then(() => { if (!listeners.signal.aborted) { render(); refreshSpotlight?.(); } });
if (import.meta.hot) import.meta.hot.dispose(() => { listeners.abort(); disposeOnboarding(); disposeTutorial(); menuSettings.destroy(); });
