import { App } from './core/app';
import { Input } from './core/input';
import { Sound } from './core/audio';
import { TitleScene, PauseScene } from './ui/screens';
import { GameScene } from './game/scene';
import { GalleryScene } from './ui/gallery';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const app = new App(canvas);
if (location.search.includes('gallery')) app.push(new GalleryScene());
else app.push(new TitleScene(app));
app.start();
canvas.focus();

Input.whenGesture(() => Sound.init());

// Pause the shift when the tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && app.top instanceof GameScene) {
    const g = app.top;
    g.openPause?.();
  }
  if (Sound.ctx) {
    Sound.muted = document.hidden;
    Sound.applyVolumes();
  }
});

// Debug/test hook (used by the automated playtest).
(window as unknown as { __eds: unknown }).__eds = { app, PauseScene };
