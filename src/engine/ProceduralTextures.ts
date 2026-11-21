import * as THREE from 'three';

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createGridFloorTexture(
  baseHex: string,
  accentHex: string,
  maxAnisotropy: number,
  tileCount = 4,
): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle surface grain
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const alpha = Math.random() * 0.06;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(x, y, 3, 3);
  }

  const step = size / tileCount;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= tileCount; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  ctx.strokeStyle = accentHex;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, size - 12, size - 12);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createWallPanelTexture(
  baseHex: string,
  trimHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Architectural seams
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, size * 0.48, size, 4);
  ctx.fillRect(size * 0.48, 0, 4, size);

  // Trim stripe near bottom
  ctx.fillStyle = trimHex;
  ctx.globalAlpha = 0.65;
  ctx.fillRect(0, size - 22, size, 12);
  ctx.globalAlpha = 1;

  // Rivets / detail dots
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let x = 24; x < size; x += 64) {
    ctx.fillRect(x, 18, 5, 5);
    ctx.fillRect(x, size - 44, 5, 5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createCrateTexture(
  baseHex: string,
  stripeHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, size - 14, size - 14);

  // Diagonal brace
  ctx.beginPath();
  ctx.moveTo(14, 14);
  ctx.lineTo(size - 14, size - 14);
  ctx.stroke();

  ctx.fillStyle = stripeHex;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(28, size * 0.44, size - 56, 26);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const [canvas, ctx] = makeCanvas(size);
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    6,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}
