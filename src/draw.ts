import { Transform } from "./graph";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewport: Rect,
  transform: Transform,
  pixelRatio: number
) {
  const log = Math.log10(transform.scale);
  const distance = Math.pow(10, Math.floor(log) + 2) * 2;
  const coarseDistance = distance * 5;
  const { x, y, w, h } = viewport;
  const fw = (Math.ceil(w / distance) + 1) * distance;
  const fh = (Math.ceil(h / distance) + 1) * distance;
  const fx = Math.floor(x / distance) * distance;
  const fy = Math.floor(y / distance) * distance;
  const cw = (Math.ceil(w / coarseDistance) + 1) * coarseDistance;
  const ch = (Math.ceil(h / coarseDistance) + 1) * coarseDistance;
  const cx = Math.floor(x / coarseDistance) * coarseDistance;
  const cy = Math.floor(y / coarseDistance) * coarseDistance;

  const pageSize = {
    w: viewport.w / transform.scale,
    h: viewport.h / transform.scale,
  };

  ctx.strokeStyle = "#eeeeee";
  ctx.save();
  ctx.scale(pixelRatio, pixelRatio);
  ctx.translate(
    -transform.translateX + pageSize.w / 2,
    -transform.translateY + pageSize.h / 2
  );
  ctx.scale(1 / transform.scale, 1 / transform.scale);

  ctx.clearRect(x, y, w, h);

  ctx.beginPath();
  for (let nx = 0; nx < fw; nx += distance) {
    ctx.moveTo(fx + nx, fy);
    ctx.lineTo(fx + nx, fy + fh);
  }

  for (let ny = 0; ny < fw; ny += distance) {
    ctx.moveTo(fx, fy + ny);
    ctx.lineTo(fx + fw, fy + ny);
  }
  ctx.lineWidth = 1 * transform.scale;
  ctx.stroke();

  ctx.beginPath();
  for (let nx = 0; nx < cw; nx += coarseDistance) {
    ctx.moveTo(cx + nx, cy);
    ctx.lineTo(cx + nx, cy + ch);
  }

  for (let ny = 0; ny < cw; ny += coarseDistance) {
    ctx.moveTo(cx, cy + ny);
    ctx.lineTo(cx + cw, cy + ny);
  }
  ctx.lineWidth = 3 * transform.scale;
  ctx.stroke();
  ctx.restore();
}
