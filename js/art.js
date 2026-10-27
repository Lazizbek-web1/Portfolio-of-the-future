// Seeded generative "photos" used wherever a real image hasn't been added yet.

function rng(seed) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function makeArt(seed, w = 640, h = 800) {
  const r = rng(seed + 7);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  const hue = Math.floor(r() * 360), hue2 = (hue + 40 + r() * 120) % 360;

  const bg = x.createLinearGradient(0, 0, w * r(), h);
  bg.addColorStop(0, `hsl(${hue} 55% 8%)`);
  bg.addColorStop(1, `hsl(${hue2} 60% 16%)`);
  x.fillStyle = bg; x.fillRect(0, 0, w, h);

  x.globalCompositeOperation = 'lighter';
  const style = seed % 4;
  if (style === 0) {
    // horizon with a low sun
    const hy = h * (.55 + r() * .2);
    const sun = x.createRadialGradient(w * (.3 + r() * .4), hy, 0, w / 2, hy, w * .7);
    sun.addColorStop(0, `hsla(${hue2} 90% 70% / .9)`); sun.addColorStop(1, 'transparent');
    x.fillStyle = sun; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = `hsl(${hue} 40% 5%)`;
    x.beginPath(); x.moveTo(0, h);
    for (let i = 0; i <= 20; i++) x.lineTo(i / 20 * w, hy + Math.sin(i * .9 + r() * 2) * h * .03 + r() * h * .03);
    x.lineTo(w, h); x.fill();
  } else if (style === 1) {
    // bokeh
    for (let i = 0; i < 70; i++) {
      const px = r() * w, py = r() * h, rad = 6 + r() * w * .09;
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, `hsla(${r() > .5 ? hue : hue2} 85% 65% / ${.15 + r() * .35})`); g.addColorStop(1, 'transparent');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill();
    }
  } else if (style === 2) {
    // star trails
    const cx = w * (.2 + r() * .6), cy = h * (r() * .3);
    for (let i = 0; i < 160; i++) {
      const rad = r() * h * 1.1, a0 = r() * 6.28, len = .2 + r() * .5;
      x.strokeStyle = `hsla(${r() > .6 ? hue2 : 210} 70% ${60 + r() * 30}% / ${.15 + r() * .5})`;
      x.lineWidth = r() * 1.6 + .3;
      x.beginPath(); x.arc(cx, cy, rad, a0, a0 + len); x.stroke();
    }
  } else {
    // city lights
    x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 26; i++) {
      const bw = w * (.04 + r() * .08), bh = h * (.15 + r() * .5), bx = r() * w;
      x.fillStyle = `hsl(${hue} 30% ${4 + r() * 6}%)`; x.fillRect(bx, h - bh, bw, bh);
      for (let k = 0; k < bh / 9; k++) if (r() > .6) {
        x.fillStyle = `hsla(${r() > .3 ? 45 : hue2} 90% 70% / ${.4 + r() * .5})`;
        x.fillRect(bx + 3 + r() * (bw - 8), h - bh + k * 9 + 3, 3, 4);
      }
    }
  }

  // film grain + vignette
  x.globalCompositeOperation = 'source-over';
  const img = x.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - .5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(img, 0, 0);
  const v = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .75);
  v.addColorStop(0, 'transparent'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  x.fillStyle = v; x.fillRect(0, 0, w, h);
  return c;
}
