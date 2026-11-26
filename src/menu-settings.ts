import { loadSettings, normalizePlayerSettings, normalizeTapSound, saveSettings } from './settings';
import {updateOnboarding} from './onboarding-state';
import type { Settings } from './settings';
import { createSongTimingPreview } from './song-timing-preview';
import { createTimingPreview } from './timing-preview';
import { TapSound } from './sound';

/** The same shared player preferences used by the game and tutorial. */
export function mountMenuSettings(): {openTiming():void;destroy():void} {
  const opener = document.getElementById('settings-toggle')!;
  const dialog = document.querySelector<HTMLDialogElement>('#settings-panel')!;
  const travel = dialog.querySelector<HTMLInputElement>('#travel')!;
  const travelValue = dialog.querySelector<HTMLOutputElement>('#travel-value')!;
  const volume = dialog.querySelector<HTMLInputElement>('#sound-volume')!;
  const value = dialog.querySelector<HTMLOutputElement>('#sound-volume-value')!;
  const status = dialog.querySelector<HTMLElement>('#storage-status')!;
  const soundStatus = dialog.querySelector<HTMLElement>('#sound-status')!;
  const select = dialog.querySelector<HTMLSelectElement>('#tap-sound')!;
  const testSound = dialog.querySelector<HTMLButtonElement>('#sound-test')!;
  const defaultStatus = status.textContent!;
  const defaultSoundStatus = soundStatus.textContent!;
  let sound: TapSound | null = null;
  const read = () => __ADMIN__ ? loadSettings() : normalizePlayerSettings(loadSettings());
  let settings = read();
  const events = new AbortController(), signal = events.signal;
  const reflect = () => {
    travel.value = String(settings.travel);
    travelValue.value = `${settings.travel}秒`;
    volume.value = String(settings.soundVolume);
    value.value = `${settings.soundVolume}%`;
    select.value = settings.tapSound;
    testSound.disabled = !settings.sound || settings.soundVolume === 0;
    if (sound) { sound.tapSound = settings.tapSound; sound.enabled = settings.sound; sound.volume = settings.soundVolume; }
  };
  function save(change: Partial<Settings>): boolean {
    settings = { ...settings, ...change };
    const saved = saveSettings(settings);
    reflect();
    status.textContent = saved ? '設定を保存しました。' : 'ブラウザへの保存ができません。ブラウザの保存設定を確認してください。';
    return saved;
  }
  let guided = false;
  const songPreview = createSongTimingPreview({ pause() {}, settings: () => settings, apply(noteOffset,checked) {
    const saved = save({noteOffset});
    if (saved && checked) {
      updateOnboarding({timing:true});
      if (guided) queueMicrotask(() => dialog.close());
      guided = false;
    }
  } });
  const preview = createTimingPreview({ pause() {}, settings: () => settings, apply: inputOffset => save({inputOffset}) });
  function openSettings(): void {
    if (dialog.open) return;
    settings = read(); reflect();
    status.textContent = defaultStatus;
    soundStatus.textContent = defaultSoundStatus;
    dialog.showModal(); opener.setAttribute('aria-expanded','true');
    dialog.querySelector<HTMLButtonElement>('#song-calibrate')!.focus();
  }
  opener.addEventListener('click', openSettings, {signal});
  dialog.querySelector('#settings-close')!.addEventListener('click', () => dialog.close(), {signal});
  function stopSound(): void { sound?.destroy(); sound = null; }
  dialog.addEventListener('close', () => {
    guided = false; stopSound(); opener.setAttribute('aria-expanded','false'); opener.focus();
  }, {signal});
  dialog.querySelector('#flow-calibrate')!.addEventListener('click', () => preview.open(), {signal});
  dialog.querySelector('#song-calibrate')!.addEventListener('click', () => songPreview.open(), {signal});
  travel.addEventListener('input', () => save({travel:travel.valueAsNumber}), {signal});
  volume.addEventListener('input', () => save({sound:true,soundVolume:volume.valueAsNumber}), {signal});
  select.addEventListener('change', () => save({tapSound:normalizeTapSound(select.value)}), {signal});
  testSound.addEventListener('click', () => {
    soundStatus.textContent = defaultSoundStatus;
    sound ??= new TapSound(() => { soundStatus.textContent = 'ノーツ音を再生できません。音量を確認して、もう一度お試しください。'; });
    reflect();
    sound.play(0);
  }, {signal});
  return {
    openTiming() { guided = true; openSettings(); songPreview.open(); },
    destroy() { events.abort(); stopSound(); preview.destroy(); songPreview.destroy(); dialog.close(); },
  };
}
