import { WINDOWS } from './engine';

export type HitZone = 'PERFECT' | 'GREAT' | 'GOOD';
export interface Target { x: number; y: number; width: number; height: number }
export interface FieldGeometry {
  width: number; height: number; origin: number; cell: number; margin: number; centerSpace: number; sharedVenue: boolean; splitStage: boolean;
  near: number; approach: number; padWidth: number; padHeight: number; targets: Target[]; pads: Target[];
}
export interface FieldPoint { x: number; y: number; width: number; scale: number }
export function fieldGeometry(width: number, height: number, stageHeight?: number, splitStage = false): FieldGeometry {
  // Six equal playable lanes; reserve 60% of the original empty center lane.
  // On narrow screens, shrink only the empty lane to keep every button at least 44px.
  const edge = Math.max(0, Math.min(8, (width - 6 * 44) / 2));
  const margin = splitStage ? Math.max(edge,(width-560)/2+8) : edge;
  const available = width - 2 * margin;
  // Landscape leaves the native 200px player plus its frame between the two wings.
  const centerSpace = splitStage ? Math.min(240,Math.max(0,available - 6 * 44)) : .6 * Math.max(0, Math.min(available / 7, available - 6 * 44));
  const cell = (available - centerSpace) / 6;
  const inputSpace = splitStage ? 24 : centerSpace;
  const inputCell = splitStage ? (available-inputSpace)/6 : cell;
  const padWidth = Math.min(80, Math.max(44, inputCell * .96));
  const padHeight = Math.min(74, Math.max(60, height * 0.15));
  const origin = Math.min(stageHeight ?? 148, Math.max(28, (height - 240) * .28));
  // Lift the row toward resting thumbs; short fields retain their usable runway.
  // This 44–92px clearance is in addition to the canvas's safe-area inset.
  const bottomClearance = 44 + Math.min(48, Math.max(0, (height - 224) * .16));
  const padY = height - bottomClearance - padHeight / 2;
  // Keep even the latest GOOD above the thumb area, at the fastest supported speed (1s).
  const lateProgress = 1 + WINDOWS.GOOD;
  const lateBottom = padY - padHeight / 2 - 16;
  const near = Math.max(origin, (lateBottom + (lateProgress - 1) * origin) / lateProgress);
  const approach = near - origin;
  const field: FieldGeometry = { width, height, origin, cell, margin, centerSpace, sharedVenue: stageHeight !== undefined, splitStage, near, approach, padWidth, padHeight, targets: [], pads: [] };
  field.targets = Array.from({ length: 6 }, (_, lane) => {
    const point = project(field, lane, 1);
    return { x: point.x, y: point.y, width: splitStage ? Math.min(padWidth,cell*.96) : padWidth, height: 20 };
  });
  field.pads = field.targets.map((target,lane) => ({ ...target, x:splitStage ? margin+(lane+.5)*inputCell+(lane>=3?inputSpace:0) : target.x, width:padWidth, y:padY, height:padHeight }));
  return field;
}
/** Concert perspective changes horizontal width only; all lanes keep equal vertical speed. */
export function project(field: FieldGeometry, lane: number, progress: number, laneEdge = 0): FieldPoint {
  const scale = 0.62 + 0.38 * Math.min(1, Math.max(0, progress));
  // Fractional lane centers remain continuous for cross-lane paths. Edges are
  // offsets within a single lane, so the white/red surfaces never absorb the blank.
  const split = Math.max(0, Math.min(1, lane - 2));
  const targetX = field.margin + (lane + 0.5 + laneEdge) * field.cell + field.centerSpace * split;
  // Each wing converges beside the live monitor, keeping every head out of its controls.
  const pivot = field.splitStage ? field.margin + 3 * field.cell + split * field.centerSpace : field.width / 2;
  return { x: pivot + (targetX - pivot) * scale,
    y: field.near + (progress - 1) * field.approach, width: (field.splitStage ? Math.min(field.padWidth,field.cell*.96) : field.padWidth) * 0.86 * scale, scale };
}
export function timingBands(field: FieldGeometry, lane: number, travel: number) {
  return (['GOOD', 'GREAT', 'PERFECT'] as const).map(kind => ({ kind,
    top: project(field, lane, 1 - WINDOWS[kind] / travel), bottom: project(field, lane, 1 + WINDOWS[kind] / travel),
  }));
}
/** The main concert uses a shallow stage below its monitor; previews keep their original stage. */
export function canvasGeometry(canvas: HTMLCanvasElement): FieldGeometry {
  const rect = canvas.getBoundingClientRect(), stageHeight = Number(canvas.dataset.stageHeight);
  return fieldGeometry(rect.width, rect.height, stageHeight > 0 && Number.isFinite(stageHeight) ? stageHeight : undefined, getComputedStyle(canvas).getPropertyValue('--split-stage').trim() === '1');
}
/** Bind thumb pads below the receptors; expose the receptor position for visible feedback. */
export function bindTargets(canvas: HTMLCanvasElement, elements: HTMLElement[]): () => void {
  const update = () => {
    const field = canvasGeometry(canvas);
    const screen=canvas.closest('.live-layout')?.querySelector('.video-section')?.getBoundingClientRect();
    const monitorBottom=screen ? screen.bottom-canvas.getBoundingClientRect().top : 0;
    // End the visible concert frame just below the console; browser clearance stays outside it.
    canvas.parentElement!.style.setProperty('--frame-bottom', `${field.pads[0].y + field.padHeight / 2 + 14}px`);
    elements.forEach((element, lane) => {
      const target = field.targets[lane], pad = field.pads[lane];
      element.style.left = `${pad.x}px`; element.style.top = `${pad.y}px`;
      element.style.width = `${pad.width}px`; element.style.height = `${pad.height}px`;
      const extension = Math.min(32, Math.max(0,pad.y - pad.height / 2 - target.y - target.height / 2 - 4));
      const extra = field.splitStage ? Math.min(extension,Math.max(0,pad.y-pad.height/2-monitorBottom-2)) : extension;
      const dx=pad.x-target.x,dy=Math.max(0,pad.y-pad.height/2-extra-target.y-target.height/2-2);
      element.style.setProperty('--receptor-x',`${target.x-pad.x+pad.width/2}px`);
      element.style.setProperty('--receptor-width',`${target.width*.86}px`);
      element.style.setProperty('--bridge-length',`${Math.hypot(dx,dy)}px`);
      element.style.setProperty('--bridge-angle',`${-Math.atan2(dx,dy)*180/Math.PI}deg`);
      element.style.setProperty('--hit-extra',`${extra}px`);
      element.style.setProperty('--receptor-y', `${target.y - pad.y + pad.height / 2}px`);
    });
  };
  const observer = new ResizeObserver(update); observer.observe(canvas); update();
  return () => observer.disconnect();
}
