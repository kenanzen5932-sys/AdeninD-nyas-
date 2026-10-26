import song from "@/assets/music.mp3.asset.json";

// Background song: the user's mp3, looped softly.
let audio: HTMLAudioElement | null = null;
let vol = 0.35;
let isMuted = true;

function apply() {
  if (audio) audio.volume = isMuted ? 0 : vol;
}

export function startMusic(muted: boolean, volume = 0.35) {
  isMuted = muted;
  vol = volume;
  if (!audio) {
    audio = new Audio(song.url);
    audio.loop = true;
    audio.preload = "auto";
  }
  apply();
  void audio.play().catch(() => {});
}

export function setMuted(m: boolean) {
  isMuted = m;
  apply();
}

export function setVolume(v: number) {
  vol = v;
  apply();
}

export function stopMusic() {
  audio?.pause();
  audio = null;
}
