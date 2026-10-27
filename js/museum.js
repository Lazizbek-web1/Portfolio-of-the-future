// "Moments": a walkable third-person photo museum. The hall grows by one bay per 8 photos.
import * as THREE from 'three';
import { GALLERY, PROFILE } from './data.js';
import { makeArt } from './art.js';

const $ = s => document.querySelector(s);
const touch = matchMedia('(hover: none)').matches;
const HW = 10, H = 6.5, BAY = 14, END = 10;
const bays = Math.max(2, Math.ceil(GALLERY.length / 8));
const zStart = 8, zEnd = 2 - bays * BAY - END;
const L = zStart - zEnd, zMid = (zStart + zEnd) / 2;
const portalZ = zEnd + 4;

// ---------- renderer ----------
const canvas = $('#world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? 1.5 : 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060c);
scene.fog = new THREE.Fog(0x05060c, 20, 75);
const camera = new THREE.PerspectiveCamera(60, 1, .05, 200);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
resize(); addEventListener('resize', resize);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
const radialTex = canvasTex(256, 256, (x, w, h) => {
  const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
});
const glowMat = (color, opacity) => new THREE.MeshBasicMaterial({ map: radialTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

// ---------- materials ----------
const floorTex = canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = '#0c0e16'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .025})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  x.strokeStyle = 'rgba(138,180,255,.09)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, w - 3, h - 3);
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
floorTex.repeat.set(HW * 2 / 4, L / 4);
const M = {
  wall: new THREE.MeshStandardMaterial({ color: 0x272b3d, roughness: .92 }),
  panel: new THREE.MeshStandardMaterial({ color: 0x2e3349, roughness: .85 }),
  floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: .5, metalness: .15 }),
  ceil: new THREE.MeshStandardMaterial({ color: 0x0b0c14, roughness: 1 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x0b0c12, roughness: .35, metalness: .7 }),
  passe: new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: .95 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x12141e, roughness: .5, metalness: .5 }),
  trim: new THREE.MeshBasicMaterial({ color: 0x8ab4ff }),
  sky: new THREE.MeshBasicMaterial({ color: 0x8796c0 }),
};

const colliders = [];   // meshes the camera must not pass through
const boxes = [];       // xz rectangles the player must not walk through
const box = (w, h, d, mat, x, y, z, collide = true) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); scene.add(m);
  if (collide) colliders.push(m);
  return m;
};

// ---------- hall ----------
{
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, L), M.floor);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, zMid); scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, L), M.ceil);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, zMid); scene.add(ceil);
  box(.5, H, L, M.wall, -HW - .25, H / 2, zMid);
  box(.5, H, L, M.wall, HW + .25, H / 2, zMid);
  box(HW * 2 + 1, H, .5, M.wall, 0, H / 2, zStart + .25);
  box(HW * 2 + 1, H, .5, M.wall, 0, H / 2, zEnd - .25);
  // glowing baseboards
  for (const s of [-1, 1]) box(.03, .03, L, M.trim, s * (HW - .015), .015, zMid, false);
  for (const z of [zStart - .015, zEnd + .015]) box(HW * 2, .03, .03, M.trim, 0, .015, z, false);
  // skylight strips with a lattice under them
  for (const x of [-4.2, 4.2]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.4, L - 2), M.sky);
    s.rotation.x = Math.PI / 2; s.position.set(x, H - .01, zMid); scene.add(s);
    for (let z = zStart - 2; z > zEnd + 1; z -= 2.2) box(1.6, .08, .08, M.dark, x, H - .06, z, false);
  }
}

scene.add(new THREE.HemisphereLight(0xb4c0e4, 0x1a1a26, 2.4));
for (let z = zStart - 4; z > zEnd; z -= 7) {
  const l = new THREE.PointLight(0xdfe6ff, 90, 24, 2);
  l.position.set(0, 5.6, z); scene.add(l);
}

// ---------- wall text ----------
function textPlane(w, h, draw, x, y, z, ry) {
  const t = canvasTex(w * 200, h * 200, draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false }));
  m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
  return m;
}

// ---------- slots + frames ----------
const slots = [];
for (let b = 0; b < bays; b++) {
  const z0 = 2 - b * BAY, zc = z0 - 7;
  box(9, 4.4, .4, M.panel, 0, 2.2, zc);
  box(9.04, .04, .44, M.trim, 0, 4.42, zc, false);
  boxes.push({ x0: -4.5, x1: 4.5, z0: zc - .2, z1: zc + .2 });
  const P = { maxW: 3.3, maxH: 2.5, y: 2.1 }, S = { maxW: 4, maxH: 2.8, y: 2.35 };
  slots.push(
    { ...P, pos: new THREE.Vector3(-2.2, P.y, zc + .2), n: new THREE.Vector3(0, 0, 1) },
    { ...P, pos: new THREE.Vector3(2.2, P.y, zc + .2), n: new THREE.Vector3(0, 0, 1) },
    { ...P, pos: new THREE.Vector3(2.2, P.y, zc - .2), n: new THREE.Vector3(0, 0, -1) },
    { ...P, pos: new THREE.Vector3(-2.2, P.y, zc - .2), n: new THREE.Vector3(0, 0, -1) },
    { ...S, pos: new THREE.Vector3(-HW, S.y, z0 - 3.5), n: new THREE.Vector3(1, 0, 0) },
    { ...S, pos: new THREE.Vector3(HW, S.y, z0 - 3.5), n: new THREE.Vector3(-1, 0, 0) },
    { ...S, pos: new THREE.Vector3(-HW, S.y, z0 - 10.5), n: new THREE.Vector3(1, 0, 0) },
    { ...S, pos: new THREE.Vector3(HW, S.y, z0 - 10.5), n: new THREE.Vector3(-1, 0, 0) },
  );
}

const frames = [];
function plaqueTex(item, i) {
  return canvasTex(560, 300, (x, w, h) => {
    x.fillStyle = 'rgba(10,12,22,.92)'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#8ab4ff'; x.font = '500 22px "JetBrains Mono"'; x.fillText(String(i + 1).padStart(2, '0') + ' / ' + String(GALLERY.length).padStart(2, '0'), 30, 52);
    x.fillStyle = '#e9edf7'; x.font = '500 46px "Space Grotesk"'; x.fillText(item.title || 'Untitled', 30, 128);
    x.fillStyle = '#7c849b'; x.font = '400 22px "JetBrains Mono"';
    const words = (item.caption || '').split(' '); let line = '', y = 180;
    for (const wd of words) {
      if (x.measureText(line + wd).width > w - 60) { x.fillText(line, 30, y); line = ''; y += 32; }
      line += wd + ' ';
    }
    x.fillText(line, 30, y);
  });
}

function makeFrame(slot, item, i) {
  const g = new THREE.Group();
  g.position.copy(slot.pos);
  g.lookAt(_v.copy(slot.pos).add(slot.n));
  scene.add(g);
  const plane = new THREE.PlaneGeometry(1, 1);
  const wash = new THREE.Mesh(plane, glowMat(0xfff1dc, .22)); wash.position.z = .01;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .08), M.frame); back.position.z = .04;
  const passe = new THREE.Mesh(plane, M.passe); passe.position.z = .081;
  const art = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ toneMapped: false, color: 0xdddddd }));
  art.position.z = .083;
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(.6, .05, .28), M.dark);
  const lampGlow = new THREE.Mesh(new THREE.PlaneGeometry(.5, .04), M.trim);
  lampGlow.rotation.x = Math.PI / 2;
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(.56, .3), new THREE.MeshBasicMaterial({ map: plaqueTex(item, i), toneMapped: false }));
  g.add(wash, back, passe, art, lamp, lampGlow, plaque);

  const pool = new THREE.Mesh(plane, glowMat(0xdfe6ff, .1));
  pool.rotation.x = -Math.PI / 2;
  pool.position.copy(slot.pos).addScaledVector(slot.n, 1.3).setY(.012);
  scene.add(pool);

  const f = { i, item, g, art, slot, w: 1, h: 1, center: slot.pos.clone().addScaledVector(slot.n, .085), n: slot.n, seen: false };
  f.fit = aspect => {
    const w = aspect > slot.maxW / slot.maxH ? slot.maxW : slot.maxH * aspect, h = w / aspect;
    f.w = w; f.h = h;
    art.scale.set(w, h, 1); passe.scale.set(w + .26, h + .26, 1); back.scale.set(w + .4, h + .4, 1);
    wash.scale.set(w * 2.3, h * 2.1, 1); wash.position.y = .2;
    lamp.position.set(0, h / 2 + .55, .2); lampGlow.position.set(0, h / 2 + .52, .2);
    plaque.position.set(w / 2 - .28, -h / 2 - .42, .02);
    pool.scale.set(w + 1.2, 1.8, 1);
  };
  const useCanvas = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; art.material.map = t; art.material.color.set(0xffffff); art.material.needsUpdate = true; f.fit(c.width / c.height); };
  if (item.src) {
    new THREE.TextureLoader().load(item.src, t => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      art.material.map = t; art.material.color.set(0xffffff); art.material.needsUpdate = true;
      f.fit(t.image.width / t.image.height);
    }, undefined, () => useCanvas(makeArt(i + 3)));
    f.fit(.8);
  } else useCanvas(makeArt(i + 3, 640, i % 3 === 2 ? 480 : 800));
  frames.push(f);
}

// ---------- sculptures + portal ----------
const spinners = [];
function sculpture(z, kind) {
  box(1.1, 1, 1.1, M.dark, 0, .5, z);
  box(1.14, .03, 1.14, M.trim, 0, 1.01, z, false);
  boxes.push({ x0: -.75, x1: .75, z0: z - .75, z1: z + .75 });
  const geo = kind === 0 ? new THREE.TorusKnotGeometry(.42, .13, 140, 14) : kind === 1 ? new THREE.IcosahedronGeometry(.62, 1) : new THREE.OctahedronGeometry(.6, 0);
  const holo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: kind === 1 ? 0xc79bff : 0x8ab4ff, wireframe: true, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  holo.position.set(0, 2.1, z); scene.add(holo);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.75, .35, 1.6, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x8ab4ff, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  beam.position.set(0, 1.85, z); scene.add(beam);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), glowMat(0x8ab4ff, .25));
  halo.position.set(0, 2.1, z); scene.add(halo);
  spinners.push({ holo, halo, base: 2.1, k: Math.random() * 6 });
}
for (let b = 1; b < bays; b++) sculpture(2 - b * BAY, b % 3);

let portal;
{
  const g = new THREE.Group(); g.position.set(0, 2.3, portalZ); scene.add(g);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, .06, 16, 96), new THREE.MeshBasicMaterial({ color: 0xc79bff, toneMapped: false }));
  const swirl = canvasTex(512, 512, (x, w, h) => {
    x.translate(w / 2, h / 2);
    for (let i = 0; i < 260; i++) {
      const a = i * .21, r = i * .95;
      x.strokeStyle = `hsla(${220 + i * .3},90%,${55 + (i % 7) * 4}%,${.5 - i / 600})`;
      x.lineWidth = 3; x.beginPath(); x.arc(0, 0, r, a, a + 1.1); x.stroke();
    }
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.56, 64), new THREE.MeshBasicMaterial({ map: swirl, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), glowMat(0xc79bff, .35));
  glow.position.z = -.05;
  g.add(glow, disc, ring);
  portal = { g, disc };
  textPlane(5, 1.4, (x, w, h) => {
    x.textAlign = 'center';
    x.fillStyle = '#8ab4ff'; x.font = '500 48px "JetBrains Mono"'; x.fillText('NEXT STOP · CONTACT', w / 2, 90);
    x.fillStyle = '#7c849b'; x.font = '400 34px "JetBrains Mono"'; x.fillText('Walk through the portal', w / 2, 170);
  }, 0, 4.7, portalZ, 0);
}

// ---------- atmosphere ----------
const motes = (() => {
  const n = 500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([(Math.random() - .5) * HW * 2, Math.random() * H, zEnd + Math.random() * L], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: .035, color: 0xbcd0ff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(p); return p;
})();

// ---------- avatar ----------
const player = { pos: new THREE.Vector3(0, 0, 5.5), vel: new THREE.Vector3(), vy: 0, face: 0, phase: 0 };
const avatar = (() => {
  const g = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: 0xe8ecf5, roughness: .55, metalness: .1 });
  const joint = new THREE.MeshStandardMaterial({ color: 0x2a3045, roughness: .6 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x0a1530, emissive: 0x3a6cff, emissiveIntensity: .9, metalness: .9, roughness: .15 });
  const body = new THREE.Group(); g.add(body);
  const mesh = (geo, mat, x, y, z, parent = body) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  mesh(new THREE.CapsuleGeometry(.24, .4, 6, 14), suit, 0, 1.13, 0);
  mesh(new THREE.BoxGeometry(.38, .44, .18), joint, 0, 1.16, .22);
  mesh(new THREE.SphereGeometry(.035, 8, 8), M.trim, .12, 1.4, .32);
  mesh(new THREE.SphereGeometry(.21, 20, 16), suit, 0, 1.63, 0);
  const v = mesh(new THREE.SphereGeometry(.16, 20, 14), visor, 0, 1.64, -.09); v.scale.set(1, .72, .7);
  const limb = (x, y, r, len) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0); body.add(pivot);
    mesh(new THREE.CapsuleGeometry(r, len, 4, 10), suit, 0, -len / 2 - r, 0, pivot);
    return pivot;
  };
  const legL = limb(-.12, .84, .095, .5), legR = limb(.12, .84, .095, .5);
  const armL = limb(-.33, 1.36, .07, .42), armR = limb(.33, 1.36, .07, .42);
  for (const leg of [legL, legR]) mesh(new THREE.BoxGeometry(.17, .1, .26), joint, 0, -.8, -.04, leg);
  armL.rotation.z = -.12; armR.rotation.z = .12;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: radialTex, color: 0x000000, transparent: true, opacity: .55, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .01;
  scene.add(g, shadow);
  return { g, body, legL, legR, armL, armR, shadow };
})();

// ---------- state + input ----------
let yaw = 0, pitch = .22, started = false, mode = 'explore', viewing = -1, near = null, leaving = false;
const keys = new Set();
const look = new THREE.Vector3(), camPos = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const ray = new THREE.Raycaster();
let locked = false, drag = null, stick = null, lookTouch = null;
// requestPointerLock returns a promise in newer browsers that rejects if the page is not focused
const lock = () => { try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch {} };

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (!started) return;
  if (mode === 'inspect') {
    if (k === 'escape' || k === 'e') closeViewer();
    else if (k === 'arrowright' || k === 'd') view(viewing + 1);
    else if (k === 'arrowleft' || k === 'a') view(viewing - 1);
    return;
  }
  if (k === 'e' && near) return view(near.i);
  if (k === ' ') e.preventDefault();
  keys.add(k);
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

canvas.addEventListener('click', () => { if (started && mode === 'explore' && !touch && !locked) lock(); });
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  $('#paused').classList.toggle('on', started && !locked && mode === 'explore' && !touch);
});
addEventListener('mousemove', e => {
  if (mode !== 'explore') return;
  if (locked || drag) { yaw -= e.movementX * .0022; pitch = Math.max(-.45, Math.min(1.05, pitch + e.movementY * .0018)); }
});
canvas.addEventListener('pointerdown', e => {
  if (!started) return;
  if (e.pointerType === 'touch') {
    if (e.clientX < innerWidth / 2 && !stick) { stick = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 }; showStick(e.clientX, e.clientY, 0, 0); }
    else if (!lookTouch) lookTouch = { id: e.pointerId, x: e.clientX, y: e.clientY };
  } else if (!locked) drag = true;
});
canvas.addEventListener('pointermove', e => {
  if (stick && e.pointerId === stick.id) {
    let dx = (e.clientX - stick.x) / 50, dy = (e.clientY - stick.y) / 50;
    const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    stick.dx = dx; stick.dy = dy; showStick(stick.x, stick.y, dx, dy);
  } else if (lookTouch && e.pointerId === lookTouch.id && mode === 'explore') {
    yaw -= (e.clientX - lookTouch.x) * .006;
    pitch = Math.max(-.45, Math.min(1.05, pitch + (e.clientY - lookTouch.y) * .005));
    lookTouch.x = e.clientX; lookTouch.y = e.clientY;
  }
});
const release = e => {
  if (stick && e.pointerId === stick.id) { stick = null; $('#stick').classList.remove('on'); }
  if (lookTouch && e.pointerId === lookTouch.id) lookTouch = null;
  drag = null;
};
addEventListener('pointerup', release); addEventListener('pointercancel', release);
function showStick(x, y, dx, dy) {
  const s = $('#stick'); s.classList.add('on');
  s.style.transform = `translate(${x}px, ${y}px)`;
  s.firstElementChild.style.transform = `translate(${dx * 33}px, ${dy * 33}px)`;
}
$('#t-look').addEventListener('click', () => { if (mode === 'inspect') closeViewer(); else if (near) view(near.i); });

// ---------- viewer ----------
function view(i) {
  if (!frames.length) return;
  i = (i + frames.length) % frames.length;
  const f = frames[i];
  mode = 'inspect'; viewing = i;
  if (document.pointerLockElement) document.exitPointerLock();
  // stand the visitor in front of the photo so leaving the viewer feels natural
  player.pos.copy(f.center).addScaledVector(f.n, 2.4).setY(0);
  player.vel.set(0, 0, 0);
  yaw = Math.atan2(f.n.x, f.n.z); player.face = yaw; pitch = .18;
  $('#v-num').textContent = `${String(i + 1).padStart(2, '0')} / ${String(frames.length).padStart(2, '0')}`;
  $('#v-title').textContent = f.item.title || 'Untitled';
  $('#v-cap').textContent = f.item.caption || '';
  $('#viewer').classList.add('on');
  $('#prompt').classList.remove('on');
  $('#paused').classList.remove('on');
  if (!f.seen) {
    f.seen = true;
    const seen = frames.filter(x => x.seen).length;
    $('#seen').textContent = seen;
    if (seen === frames.length) toast("You've seen every photo ✦ The portal at the end is waiting");
  }
}
function closeViewer() {
  mode = 'explore'; viewing = -1;
  $('#viewer').classList.remove('on');
  $('#paused').classList.toggle('on', !touch && !locked);
  if (!touch) lock();
}
$('#v-prev').addEventListener('click', () => view(viewing - 1));
$('#v-next').addEventListener('click', () => view(viewing + 1));
$('#v-close').addEventListener('click', closeViewer);

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 4200);
}

// ---------- movement ----------
function collide(p, r) {
  p.x = Math.max(-HW + r, Math.min(HW - r, p.x));
  p.z = Math.max(zEnd + r, Math.min(zStart - r, p.z));
  for (const b of boxes) {
    const cx = Math.max(b.x0, Math.min(b.x1, p.x)), cz = Math.max(b.z0, Math.min(b.z1, p.z));
    const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d < r) {
      if (d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
      else { p.z = (p.z - b.z0 < b.z1 - p.z) ? b.z0 - r : b.z1 + r; }
    }
  }
}

function updatePlayer(dt) {
  let ix = 0, iz = 0;
  if (mode === 'explore') {
    if (keys.has('w') || keys.has('arrowup')) iz += 1;
    if (keys.has('s') || keys.has('arrowdown')) iz -= 1;
    if (keys.has('d') || keys.has('arrowright')) ix += 1;
    if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
    if (stick) { ix += stick.dx; iz -= stick.dy; }
  }
  const mag = Math.min(1, Math.hypot(ix, iz));
  const run = keys.has('shift') || (stick && Math.hypot(stick.dx, stick.dy) > .95);
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  _v.set(fx * iz + rx * ix, 0, fz * iz + rz * ix);
  if (_v.lengthSq() > 0) _v.normalize().multiplyScalar(mag * (run ? 6.2 : 3.1));
  player.vel.lerp(_v, 1 - Math.exp(-dt * 10));
  player.pos.addScaledVector(player.vel, dt);
  collide(player.pos, .34);

  if (keys.has(' ') && player.pos.y <= 0 && mode === 'explore') player.vy = 5.2;
  player.vy -= 15 * dt;
  player.pos.y = Math.max(0, player.pos.y + player.vy * dt);
  if (player.pos.y === 0) player.vy = Math.max(0, player.vy);

  const sp = Math.hypot(player.vel.x, player.vel.z);
  if (sp > .2) {
    const want = Math.atan2(-player.vel.x, -player.vel.z);
    let d = want - player.face; d = Math.atan2(Math.sin(d), Math.cos(d));
    player.face += d * (1 - Math.exp(-dt * 12));
  }
  const a = avatar, amt = Math.min(1, sp / 3.1), air = player.pos.y > .02;
  player.phase += sp * dt * 2.8;
  const s = Math.sin(player.phase) * (air ? 0 : .75 * amt);
  a.legL.rotation.x = air ? .5 : s; a.legR.rotation.x = air ? -.3 : -s;
  a.armL.rotation.x = -s * .8; a.armR.rotation.x = s * .8;
  a.body.position.y = air ? 0 : Math.abs(Math.cos(player.phase)) * .05 * amt + Math.sin(performance.now() * .002) * .008;
  a.body.rotation.x = -amt * .08 * (run ? 1.6 : 1);
  a.g.position.copy(player.pos); a.g.rotation.y = player.face;
  a.g.visible = a.shadow.visible = mode !== 'inspect';
  a.shadow.position.set(player.pos.x, .012, player.pos.z);
  a.shadow.material.opacity = .55 / (1 + player.pos.y * 1.5);

  // nearest photo the visitor is standing in front of
  near = null; let best = 5;
  if (mode === 'explore') for (const f of frames) {
    _v2.copy(player.pos).sub(f.center).setY(0);
    const d = _v2.length(), front = _v2.dot(f.n);
    if (d < best && front > .05) { best = d; near = f; }
  }
  $('#prompt').classList.toggle('on', !!near && started);
  $('#t-look').classList.toggle('ready', !!near || mode === 'inspect');

  if (!leaving && Math.abs(player.pos.z - portalZ) < .5 && Math.abs(player.pos.x) < 1.3) {
    leaving = true;
    $('#fade').classList.remove('clear');
    setTimeout(() => { location.href = 'index.html#contact'; }, 900);
  }
}

function updateCamera(dt) {
  if (mode === 'inspect') {
    const f = frames[viewing];
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max((f.h + .8) / 2 / t, (f.w + .8) / 2 / (t * camera.aspect)) * (innerWidth > 900 ? 1.15 : 1.3);
    const side = innerWidth > 900 ? dist * .16 : 0;
    _v.set(-f.n.z, 0, f.n.x); // to the photo's right, so the viewer panel never covers it
    camPos.copy(f.center).addScaledVector(f.n, dist).addScaledVector(_v, side);
    _v2.copy(f.center).addScaledVector(_v, side);
    if (innerWidth <= 900) { camPos.y -= f.h * .22; _v2.y -= f.h * .22; }
    const k = 1 - Math.exp(-dt * 4);
    camera.position.lerp(camPos, k); look.lerp(_v2, k);
  } else {
    const tgt = _v2.set(player.pos.x + Math.cos(yaw) * .38, player.pos.y + 1.55, player.pos.z - Math.sin(yaw) * .38);
    _v.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    let dist = 4.4;
    ray.set(tgt, _v); ray.far = dist;
    const hit = ray.intersectObjects(colliders, false)[0];
    if (hit) dist = Math.max(.4, hit.distance - .25);
    camPos.copy(tgt).addScaledVector(_v, dist);
    camPos.y = Math.min(H - .25, Math.max(.25, camPos.y));
    const k = 1 - Math.exp(-dt * 14);
    camera.position.lerp(camPos, k); look.lerp(tgt, k);
  }
  camera.lookAt(look);
}

// ---------- minimap ----------
const map = $('#map'), mx = map.getContext('2d');
function drawMap() {
  const W = map.width, Hh = map.height, pad = 12, s = Math.min((W - pad * 2) / (HW * 2), (Hh - pad * 2) / L);
  const X = x => W / 2 + x * s, Z = z => pad + (zStart - z) * s;
  mx.clearRect(0, 0, W, Hh);
  mx.strokeStyle = 'rgba(255,255,255,.18)'; mx.lineWidth = 2;
  mx.strokeRect(X(-HW), Z(zStart), HW * 2 * s, L * s);
  mx.fillStyle = 'rgba(255,255,255,.25)';
  for (const b of boxes) mx.fillRect(X(b.x0), Z(b.z1), (b.x1 - b.x0) * s, Math.max(2, (b.z1 - b.z0) * s));
  for (const f of frames) {
    mx.fillStyle = f.seen ? '#8ab4ff' : 'rgba(124,132,155,.8)';
    mx.beginPath(); mx.arc(X(f.center.x + f.n.x * .4), Z(f.center.z + f.n.z * .4), 3, 0, 7); mx.fill();
  }
  mx.fillStyle = '#c79bff'; mx.fillRect(X(-1.6), Z(portalZ) - 1.5, 3.2 * s, 3);
  mx.save(); mx.translate(X(player.pos.x), Z(player.pos.z)); mx.rotate(-yaw);
  mx.fillStyle = '#fff'; mx.beginPath(); mx.moveTo(0, -7); mx.lineTo(5, 5); mx.lineTo(-5, 5); mx.closePath(); mx.fill();
  mx.restore();
}

// ---------- loop ----------
let last = performance.now(), time = 0;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, .05);
  last = now; time += dt;
  if (!started) { yaw = Math.sin(time * .15) * .5; pitch = .3; }
  updatePlayer(dt);
  updateCamera(dt);
  for (const s of spinners) {
    s.holo.rotation.y += dt * .5; s.holo.rotation.x = Math.sin(time * .4 + s.k) * .3;
    s.holo.position.y = s.base + Math.sin(time * 1.2 + s.k) * .08;
    s.halo.lookAt(camera.position);
  }
  portal.disc.rotation.z -= dt * .8;
  motes.rotation.y = Math.sin(time * .05) * .02;
  motes.position.y = Math.sin(time * .3) * .1;
  drawMap();
  renderer.render(scene, camera);
});

// ---------- boot ----------
(async () => {
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]); } catch {}
  textPlane(4.6, 2.3, (x, w, h) => {
    x.fillStyle = '#e9edf7'; x.font = '300 190px "Space Grotesk"'; x.fillText('Moments', 10, 200);
    x.fillStyle = '#8ab4ff'; x.fillText('.', x.measureText('Moments').width + 14, 200);
    x.fillStyle = '#c3c9d8'; x.font = '400 36px "JetBrains Mono"'; x.fillText('PHOTOGRAPHS BY ' + PROFILE.name.toUpperCase(), 14, 290);
    x.fillStyle = '#7c849b'; x.font = '400 30px "JetBrains Mono"'; x.fillText('Walk slowly. Get close. The far end leads on.', 14, 360);
  }, -HW + .02, 3.1, 4.2, Math.PI / 2);
  textPlane(6, 1, (x, w, h) => {
    x.textAlign = 'center'; x.fillStyle = '#c3c9d8'; x.font = '400 46px "JetBrains Mono"';
    x.fillText('THANKS FOR WALKING THROUGH', w / 2, 110);
  }, 0, 5.6, zEnd + .02, 0);
  GALLERY.forEach((item, i) => slots[i] && makeFrame(slots[i], item, i));
  $('#total').textContent = frames.length;
  $('#fade').classList.add('clear');
  const btn = $('#enter');
  $('#enter-label').textContent = 'Enter the museum';
  btn.disabled = false;
  btn.addEventListener('click', () => {
    started = true; yaw = 0; pitch = .2;
    $('#intro').classList.add('gone');
    if (!touch) lock();
  });
})();
