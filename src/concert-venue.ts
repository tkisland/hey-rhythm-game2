import venueUrl from './assets/concert-monitor-venue.webp?url';
import {canvasGeometry} from './field-geometry';

// The six performers' feet in the 887x1774 artwork. Align this row with p=0.
const STAGE_DECK = 796;

/** One cached backdrop spans the real monitor and the transparent game canvas. */
export function bindConcertVenue(canvas: HTMLCanvasElement, monitor: HTMLElement, host: HTMLElement): () => void {
  const backdrop = document.createElement('canvas');
  backdrop.className = 'concert-backdrop'; backdrop.setAttribute('aria-hidden','true');
  host.prepend(backdrop);
  const ctx = backdrop.getContext('2d')!, image = new Image();
  let frame = 0, disposed = false;
  const draw = () => {
    frame = 0;
    if (disposed || !image.complete || !image.naturalWidth) return;
    const fieldRect = canvas.getBoundingClientRect(), monitorRect = monitor.getBoundingClientRect();
    if(fieldRect.width<1||fieldRect.height<1)return;
    const field = canvasGeometry(canvas);
    // Portrait shares the deck with the note origin; landscape surrounds a central monitor.
    const beside = monitorRect.right <= fieldRect.left;
    const top = field.splitStage ? Math.min(fieldRect.top,monitorRect.top) : beside ? fieldRect.top : monitorRect.top;
    let stageY = fieldRect.top - top + field.origin;
    const height = fieldRect.top - top + field.pads[0].y + field.padHeight / 2 + 14;
    if (field.splitStage) {
      const screen = monitor.querySelector('.video-section')!.getBoundingClientRect();
      stageY = Math.min(height - 24,screen.bottom - top + 32);
    }
    const width = fieldRect.width, dpr = Math.min(2,window.devicePixelRatio || 1);
    backdrop.style.left = `${fieldRect.left}px`; backdrop.style.top = `${top}px`;
    backdrop.style.width = `${width}px`; backdrop.style.height = `${height}px`;
    backdrop.width = Math.round(width*dpr); backdrop.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    // The same image and horizontal scale meet at the deck; there are no
    // separately cropped video/notes backgrounds or rounded panel seams.
    const sourceTop = beside && !field.splitStage ? STAGE_DECK - 120 : 0;
    ctx.drawImage(image,0,sourceTop,image.naturalWidth,STAGE_DECK-sourceTop,0,0,width,stageY);
    ctx.drawImage(image,0,STAGE_DECK,image.naturalWidth,image.naturalHeight-STAGE_DECK,0,stageY,width,height-stageY);
  };
  const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(draw); };
  const observer = new ResizeObserver(schedule);
  observer.observe(canvas); observer.observe(monitor); observer.observe(host);
  window.addEventListener('resize',schedule);
  image.onload = schedule; image.src = venueUrl; schedule();
  return () => {
    disposed = true; cancelAnimationFrame(frame); observer.disconnect();
    window.removeEventListener('resize',schedule); image.onload = null; backdrop.remove();
  };
}
