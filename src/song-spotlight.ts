import type { Song } from './songs';

const DAY_MS = 86_400_000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const japanDay = (now: number) => Math.floor((now + JST_OFFSET_MS) / DAY_MS);

// Keep rosters newest first. Add a new roster at a cycle boundary when songs join.
const firstRoster = ['super-mommy-girls', 'biscuit-case', 'playful-romantic', 'happy-go-round', 'poji-poji-go', 'yozora-with-you'];
const rotations = [{
  firstDay: japanDay(Date.parse('2026-12-02T00:00:00+09:00')),
  songs: [...firstRoster, 'hey-yummy', 'look'],
}, {
  firstDay: japanDay(Date.parse('2026-11-26T00:00:00+09:00')),
  songs: firstRoster,
}];

export function dailySong(songs: readonly Song[], now = Date.now()): Song | undefined {
  const day = japanDay(now);
  const rotation = rotations.find(item => item.firstDay <= day) ?? rotations[rotations.length - 1];
  const index = ((day - rotation.firstDay) % rotation.songs.length + rotation.songs.length) % rotation.songs.length;
  for (let step = 0; step < rotation.songs.length; step++) {
    const id = rotation.songs[(index + step) % rotation.songs.length];
    const song = songs.find(candidate => candidate.id === id);
    if (song) return song;
  }
}

export function nextJapanDay(now = Date.now()): number {
  return (japanDay(now) + 1) * DAY_MS - JST_OFFSET_MS;
}

export function randomSong(songs: readonly Song[], previous: string | null): Song | undefined {
  const choices = songs.length > 1 ? songs.filter(song => song.id !== previous) : songs;
  return choices[Math.floor(Math.random() * choices.length)];
}
