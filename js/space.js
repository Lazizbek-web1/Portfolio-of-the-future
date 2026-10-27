// The galaxy behind the whole site. Story mode flies the camera along a path as the page scrolls;
// pilot mode hands the camera to a ship the visitor flies between project star systems.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
const pick = a => a[Math.floor(Math.random() * a.length)];
// raw sRGB components: the point shaders write straight to the canvas, so no color management here
const rgb = hex => [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255];

const VERT = /* glsl */`
uniform float uTime, uPixel, uScale, uMax, uNear, uTw;
attribute float aSize, aSeed;
attribute vec3 aColor;
varying vec3 vColor;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 0.001);
  float s = aSize * uScale * uPixel / dist;
  vA = 1.0 - uTw + uTw * sin(uTime * (0.6 + aSeed * 2.4) + aSeed * 60.0);
  vA *= smoothstep(uNear * 0.25, uNear, dist);
  float m = 1.4 * uPixel;
  if (s < m) { vA *= s / m; s = m; }
  gl_PointSize = min(s, uMax * uPixel);
  vColor = aColor;
}`;
const FRAG_STAR = /* glsl */`
varying vec3 vColor;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0;
  if (d > 1.0) discard;
  float a = (exp(-d * 14.0) + exp(-d * 4.0) * 0.28) * vA * (1.0 - d);
  gl_FragColor = vec4(vColor * a, 1.0);
}`;
const FRAG_CLOUD = /* glsl */`
uniform float uAlpha;
varying vec3 vColor;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0;
  if (d > 1.0) discard;
  float a = exp(-d * 3.0) * (1.0 - d) * vA * uAlpha;
  gl_FragColor = vec4(vColor * a, 1.0);
}`;
const FRAG_DUST = /* glsl */`
uniform float uAlpha;
varying vec3 vColor;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0;
  if (d > 1.0) discard;
  gl_FragColor = vec4(vColor, exp(-d * 2.5) * (1.0 - d) * vA * uAlpha);
}`;

function pointLayer(n, frag, { scale = 260, max = 48, near = 1.5, tw = .22, alpha = 1, blending = THREE.AdditiveBlending } = {}) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), seed = new Float32Array(n);
  let i = 0;
  const put = (x, y, z, hex, s, b = 1) => {
    if (i >= n) return;
    const c = rgb(hex);
    pos.set([x, y, z], i * 3); col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
    size[i] = s; seed[i] = Math.random(); i++;
  };
  const done = () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, i * 3), 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col.subarray(0, i * 3), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size.subarray(0, i), 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed.subarray(0, i), 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, uScale: { value: scale }, uMax: { value: max }, uNear: { value: near }, uTw: { value: tw }, uAlpha: { value: alpha } },
      vertexShader: VERT, fragmentShader: frag, transparent: true, depthWrite: false, blending,
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    return p;
  };
  return { put, done };
}

// arm k of 4, logarithmic spiral
const ARM_OFF = [0, TAU / 4, TAU / 2, TAU * .75];
const armAngle = (k, r) => ARM_OFF[k] + 2.05 * Math.log(r / 7);

const PAL = {
  core: [0xffe2b8, 0xfff3df, 0xffcf9a, 0xffe9c9],
  arm: [0xa8c6ff, 0xd9e4ff, 0x8ab4ff, 0xbfd3ff],
  violet: [0xc79bff, 0xb08cff, 0xd6b8ff],
  pink: [0xff8fcf, 0xff6fae, 0xff9be0],
  field: [0x8f9ccf, 0x6f7bb0, 0xa3acd6],
};

function texture(draw, s = 128) {
  const c = document.createElement('canvas'); c.width = c.height = s;
  draw(c.getContext('2d'), s);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const glowTexture = () => texture((x, s) => {
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.12, 'rgba(255,255,255,.65)');
  g.addColorStop(.35, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
});
const farGalaxyTexture = hue => texture((x, s) => {
  x.translate(s / 2, s / 2); x.scale(1, .38);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, s / 2);
  g.addColorStop(0, `hsla(${hue},80%,92%,1)`); g.addColorStop(.2, `hsla(${hue},70%,70%,.45)`); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, s / 2, 0, TAU); x.fill();
}, 256);

// camera keyframes for the six chapters: hero, origin, toolkit, work, gallery, contact
function storyKeys(narrow) {
  return [
    [[8, 78, 152], narrow ? [0, -82, 0] : [-64, -12, 8]],
    [[112, 26, 48], [8, 0, -14]],
    [[56, 5, -18], [-4, 2, -66]],
    [[-12, 20, -58], [-64, -2, 4]],
    [[-74, 9, 22], [-18, 0, 44]],
    [[24, 46, 104], narrow ? [0, -70, 0] : [-40, -8, 6]],
  ];
}

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);

export class Space {
  constructor(canvas, projects, { labelLayer, onMode, onOpenDormant } = {}) {
    this.projects = projects;
    this.onMode = onMode || (() => {});
    this.onOpenDormant = onOpenDormant || (() => {});
    this.touch = matchMedia('(hover: none)').matches;
    this.small = innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4;
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, this.small ? 1.5 : 1.75));
    r.setClearColor(0x04050a, 1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, .1, 6000);
    this.scene.add(this.camera);

    this.glow = glowTexture();
    this.layers = [];
    this.buildGalaxy(this.small ? 42000 : 95000);
    this.buildSky();
    this.systems = projects.map(p => this.buildSystem(p));
    this.buildShip();
    this.buildStreaks();
    this.buildLabels(labelLayer);

    this.chapter = 0; this.chapterSmooth = 0;
    this.px = 0; this.py = 0;
    this.look = new THREE.Vector3(-52, -10, 8);
    this.camera.position.set(30, 140, 260);
    this.pilot = false;
    this.keys = new Set();
    this.speed = 0; this.throttle = 0; this.time = 0;
    this.hud = id => document.getElementById(id);

    this.resize();
    addEventListener('resize', () => this.resize());
    this.bindInput();
    this.last = performance.now();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  // ---------- world ----------
  buildGalaxy(N) {
    const core = pointLayer(Math.floor(N * .14), FRAG_STAR, { near: 2 });
    for (let k = 0; k < N * .14; k++) {
      if (Math.random() < .6) core.put(gauss() * 4.2, gauss() * 2.6, gauss() * 4.2, pick(PAL.core), 1 + Math.random() * 1.1, .4 + Math.random() * .4);
      else core.put(gauss() * 10, gauss() * 1.8, gauss() * 3, pick(PAL.core), .9 + Math.random() * .9, .35 + Math.random() * .35);
    }
    this.core = core.done();

    const disk = pointLayer(Math.floor(N * .86), FRAG_STAR);
    const W = [.32, .18, .32, .18];
    const arm = () => { let u = Math.random(), k = 0; while (u > W[k]) u -= W[k++]; return k; };
    for (let n = 0; n < N * .56; n++) {
      const k = arm();
      const r = 7 + -Math.log(1 - Math.random() * .985) * 24;
      const sp = gauss() * (1.2 + r * .06);
      const a = armAngle(k, r) + sp / r;
      const rr = r + gauss() * (1 + r * .04);
      const y = gauss() * (.5 + 3 * Math.exp(-r / 18));
      const fall = .5 + .5 * Math.exp(-r / 60);
      const u = Math.random();
      let hex, s = .7 + Math.random() * 1.1, b = (.55 + .45 * Math.random()) * fall;
      if (u < .55) hex = pick(PAL.arm);
      else if (u < .72) hex = pick(PAL.violet);
      else if (u < .78) { hex = pick(PAL.pink); s = 1.8 + Math.random() * 1.6; b = 1; }
      else hex = 0xfff1dc;
      if (Math.random() < .02) { s = 3 + Math.random() * 1.5; b = 1; }
      disk.put(Math.cos(a) * rr, y, Math.sin(a) * rr, hex, s, b);
    }
    for (let n = 0; n < N * .22; n++) {
      const r = Math.min(-Math.log(1 - Math.random() * .99) * 30, 118), a = Math.random() * TAU;
      disk.put(Math.cos(a) * r, gauss() * (.8 + 2.5 * Math.exp(-r / 20)), Math.sin(a) * r, pick(PAL.field), .6 + Math.random() * .7, .35 + Math.random() * .35);
    }
    for (let n = 0; n < N * .04; n++) disk.put(gauss() * 55, gauss() * 32, gauss() * 55, pick(PAL.field), .6 + Math.random() * .5, .2 + Math.random() * .25);
    // two dwarf satellite galaxies
    for (const [cx, cy, cz] of [[138, 18, -64], [-112, -26, 108]]) {
      for (let n = 0; n < N * .02; n++) {
        const t = Math.random() * TAU, rr = Math.abs(gauss()) * 5.5;
        disk.put(cx + Math.cos(t + rr * .5) * rr, cy + gauss() * 1.4, cz + Math.sin(t + rr * .5) * rr * .6, pick(Math.random() < .5 ? PAL.violet : PAL.arm), .8 + Math.random() * .8, .5 + Math.random() * .4);
      }
    }
    this.disk = disk.done();

    const nN = this.small ? 160 : 280;
    const clouds = pointLayer(nN + 40, FRAG_CLOUD, { max: 320, near: 26, tw: .04, alpha: .085 });
    for (let n = 0; n < nN; n++) {
      const k = Math.random() < .7 ? (Math.random() < .5 ? 0 : 2) : (Math.random() < .5 ? 1 : 3);
      const r = 12 + Math.random() * 82, a = armAngle(k, r) + gauss() * .08;
      const u = Math.random();
      clouds.put(Math.cos(a) * r, gauss() * 1.2, Math.sin(a) * r, u < .45 ? pick(PAL.violet) : u < .75 ? pick(PAL.arm) : pick(PAL.pink), 18 + Math.random() * 26, .55 + Math.random() * .45);
    }
    for (let n = 0; n < 24; n++) clouds.put(gauss() * 5, gauss() * 1.5, gauss() * 5, pick(PAL.core), 30 + Math.random() * 20, .4);
    this.clouds = clouds.done();

    // dust lanes trail the inner edge of the two main arms and darken the glow behind them
    const dust = pointLayer(this.small ? 140 : 240, FRAG_DUST, { max: 260, near: 20, tw: 0, alpha: .32, blending: THREE.NormalBlending });
    for (let n = 0; n < (this.small ? 140 : 240); n++) {
      const k = Math.random() < .5 ? 0 : 2, r = 10 + Math.random() * 70, a = armAngle(k, r) - .28 + gauss() * .05;
      dust.put(Math.cos(a) * r, gauss() * .6, Math.sin(a) * r, 0x07060c, 12 + Math.random() * 16, 1);
    }
    this.dust = dust.done();

    this.clouds.renderOrder = 0; this.dust.renderOrder = 1; this.core.renderOrder = 2; this.disk.renderOrder = 2;
    this.galaxy = new THREE.Group();
    this.galaxy.add(this.clouds, this.dust, this.disk);
    this.galaxy.rotation.x = .04;
    this.coreSpin = new THREE.Group();
    this.coreSpin.add(this.core);
    this.galaxy.add(this.coreSpin);
    this.scene.add(this.galaxy);
    this.layers.push(this.core, this.disk, this.clouds, this.dust);
  }

  buildSky() {
    this.sky = new THREE.Group();
    const n = 5000, sky = pointLayer(n, FRAG_STAR, { near: .01, tw: .3 });
    for (let i = 0; i < n; i++) {
      _v.set(gauss(), gauss(), gauss()).normalize().multiplyScalar(900 + Math.random() * 500);
      sky.put(_v.x, _v.y, _v.z, pick([0xffffff, 0xcfdcff, 0xffe8cc, 0xbfc9ff]), Math.random() < .04 ? 7 + Math.random() * 4 : 2.5 + Math.random() * 2.5, .5 + Math.random() * .5);
    }
    const pts = sky.done();
    this.sky.add(pts); this.layers.push(pts);
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: farGalaxyTexture(200 + Math.random() * 140), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55, rotation: Math.random() * TAU }));
      _v.set(gauss(), gauss() * .6, gauss()).normalize().multiplyScalar(1500);
      s.position.copy(_v); s.scale.setScalar(50 + Math.random() * 90);
      this.sky.add(s);
    }
    this.scene.add(this.sky);
  }

  buildSystem(p) {
    const g = new THREE.Group();
    const a = p.star.a * Math.PI / 180;
    g.position.set(Math.cos(a) * p.star.r, p.star.y, Math.sin(a) * p.star.r);
    const color = new THREE.Color().setHSL(p.hue / 360, .85, .68);
    const add = (o) => (g.add(o), o);
    const sprite = (c, s, o) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o }));
      sp.scale.setScalar(s); return add(sp);
    };
    const halo = sprite(color, p.live ? 9 : 5, p.live ? .95 : .45);
    sprite(0xffffff, p.live ? 1.8 : 1.1, p.live ? 1 : .6);
    const circle = R => new THREE.BufferGeometry().setFromPoints(Array.from({ length: 97 }, (_, i) => new THREE.Vector3(Math.cos(i / 96 * TAU) * R, 0, Math.sin(i / 96 * TAU) * R)));
    const rings = [];
    for (const [R, tilt] of p.live ? [[2.6, .25], [4.2, -.4]] : [[2.4, .3]]) {
      const ring = p.live
        ? new THREE.Line(circle(R), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }))
        : new THREE.Line(circle(R), new THREE.LineDashedMaterial({ color: 0x9aa3c4, dashSize: .35, gapSize: .45, transparent: true, opacity: .4, depthWrite: false }));
      if (!p.live) ring.computeLineDistances();
      ring.rotation.x = tilt; ring.rotation.z = tilt * .6;
      rings.push({ ring, R, phase: Math.random() * TAU, speed: (p.live ? .9 : .4) / R });
      add(ring);
    }
    const planets = rings.map(({ ring }) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 12), new THREE.MeshBasicMaterial({ color: p.live ? color : 0x6f7894 }));
      ring.add(m); return m;
    });
    let beamLine = null;
    if (p.live) {
      const beam = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -16, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 16, 0)]);
      beam.setAttribute('color', new THREE.Float32BufferAttribute([0, 0, 0, color.r, color.g, color.b, 0, 0, 0], 3));
      beamLine = add(new THREE.Line(beam, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    }
    this.galaxy.add(g);
    return { p, g, halo, rings, planets, beam: beamLine, world: new THREE.Vector3(), dist: Infinity };
  }

  buildShip() {
    const ship = this.ship = new THREE.Object3D();
    const body = this.shipBody = new THREE.Group();
    ship.add(body);
    const hull = new THREE.MeshStandardMaterial({ color: 0xc9d3e8, metalness: .55, roughness: .32 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b2135, metalness: .7, roughness: .4 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x8e9ab8, metalness: .6, roughness: .35, side: THREE.DoubleSide });

    const lathe = new THREE.LatheGeometry([[0, 0], [.27, 0], [.36, .7], [.32, 1.5], [.18, 2.2], [0, 2.75]].map(([a, b]) => new THREE.Vector2(a, b)), 24);
    lathe.rotateX(-Math.PI / 2); lathe.translate(0, 0, 1.2);
    body.add(new THREE.Mesh(lathe, hull));

    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: 0x1a2a55, emissive: 0x2a4aa8, emissiveIntensity: .6, metalness: .9, roughness: .1 }));
    cockpit.scale.set(.2, .16, .5); cockpit.position.set(0, .24, -.55);
    body.add(cockpit);

    const shape = new THREE.Shape();
    shape.moveTo(.25, -.6); shape.lineTo(1.75, .85); shape.lineTo(1.75, 1.12); shape.lineTo(.25, .75); shape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(shape, { depth: .05, bevelEnabled: false });
    wingGeo.rotateX(Math.PI / 2); wingGeo.translate(0, .02, .2);
    const wR = new THREE.Mesh(wingGeo, wingMat), wL = wR.clone(); wL.scale.x = -1;
    body.add(wR, wL);

    const fin = new THREE.Shape();
    fin.moveTo(0, 0); fin.lineTo(.75, 0); fin.lineTo(.95, .7); fin.lineTo(.75, .7); fin.closePath();
    const finGeo = new THREE.ExtrudeGeometry(fin, { depth: .04, bevelEnabled: false });
    finGeo.rotateY(-Math.PI / 2); finGeo.translate(.02, .2, .45);
    body.add(new THREE.Mesh(finGeo, wingMat));

    this.flames = [];
    for (const x of [-.48, .48]) {
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(.14, .17, .8, 14), dark);
      eng.rotation.x = Math.PI / 2; eng.position.set(x, -.02, .95);
      body.add(eng);
      const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0x8ab4ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      f.position.set(x, -.02, 1.45); body.add(f); this.flames.push(f);
    }
    this.tipLights = [[-1.75, 0xff4d6d], [1.75, 0x4dffb5]].map(([x, c]) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.position.set(x, .03, 1.2); s.scale.setScalar(.5); body.add(s); return s;
    });

    this.scene.add(new THREE.AmbientLight(0x56648a, 1.1));
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.4); sun.position.set(40, 90, 30);
    this.scene.add(sun);
    ship.visible = false;
    this.scene.add(ship);
  }

  buildStreaks() {
    const n = 220, pos = new Float32Array(n * 6);
    this.streakData = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0 }));
    this.streakData.forEach(s => this.resetStreak(s, true));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.streaks = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.streaks.frustumCulled = false;
    this.camera.add(this.streaks);
  }
  resetStreak(s, any) {
    const a = Math.random() * TAU, r = 2 + Math.random() * 16;
    s.x = Math.cos(a) * r; s.y = Math.sin(a) * r; s.z = any ? -Math.random() * 80 : -80;
  }

  buildLabels(layer) {
    this.labelLayer = layer;
    if (!layer) return;
    for (const s of this.systems) {
      const b = document.createElement('button');
      b.className = 'sys' + (s.p.live ? ' live' : '');
      b.innerHTML = `<i></i><span class="nm"></span><span class="ds"></span>`;
      b.querySelector('.nm').textContent = s.p.name;
      b.querySelector('.ds').textContent = (s.p.live ? 'Live' : 'Dormant') + ' · ' + s.p.kind + ' · fly there';
      b.addEventListener('click', e => { e.stopPropagation(); this.pilot ? this.setTarget(s) : this.enterPilot(s.p.id); });
      layer.appendChild(b);
      s.label = b;
    }
  }

  // ---------- input ----------
  bindInput() {
    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      this.px = e.clientX / innerWidth * 2 - 1; this.py = e.clientY / innerHeight * 2 - 1;
    });
    document.addEventListener('pointerleave', () => { this.px = this.py = 0; });
    addEventListener('keydown', e => {
      if (typing(e)) return;
      const k = e.key.toLowerCase();
      if (!this.pilot) { if (k === 'p' && !e.metaKey && !e.ctrlKey) this.enterPilot(); return; }
      if (k === 'escape') return this.exitPilot();
      if (k === 'tab' || k === 't') { e.preventDefault(); this.cycleTarget(); return; }
      if (k === 'e' || k === 'enter') { this.interact(); return; }
      if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
      this.keys.add(k);
      if (this.autopilot && ['w', 's', 'a', 'd', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) this.setAutopilot(false);
    });
    addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());

    // touch: drag anywhere to steer like a joystick
    const canvas = this.renderer.domElement;
    this.stick = null;
    canvas.addEventListener('pointerdown', e => {
      if (!this.pilot) return;
      if (e.pointerType === 'touch') this.stick = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
      if (this.autopilot) this.setAutopilot(false);
    });
    canvas.addEventListener('pointermove', e => {
      if (this.stick && e.pointerId === this.stick.id) {
        this.stick.dx = Math.max(-1, Math.min(1, (e.clientX - this.stick.x) / 70));
        this.stick.dy = Math.max(-1, Math.min(1, (e.clientY - this.stick.y) / 70));
      }
    });
    const end = e => { if (this.stick && e.pointerId === this.stick.id) this.stick = null; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }

  setPointerBoost(on) { on ? this.keys.add('shift') : this.keys.delete('shift'); }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const narrow = w < 900;
    if (narrow !== this.narrow) {
      this.narrow = narrow;
      const K = storyKeys(narrow);
      this.pathPos = new THREE.CatmullRomCurve3(K.map(k => new THREE.Vector3(...k[0])), false, 'centripetal');
      this.pathLook = new THREE.CatmullRomCurve3(K.map(k => new THREE.Vector3(...k[1])), false, 'centripetal');
    }
    for (const l of this.layers) l.material.uniforms.uPixel.value = this.renderer.getPixelRatio() * (h / 900);
  }

  setChapter(c) { this.chapter = c; }

  // ---------- pilot mode ----------
  enterPilot(targetId) {
    if (!this.pilot) {
      this.pilot = true;
      const cam = this.camera;
      cam.getWorldDirection(_v);
      this.ship.position.copy(cam.position).addScaledVector(_v, 10).addScaledVector(_v2.set(0, 1, 0).applyQuaternion(cam.quaternion), -1.2);
      this.ship.quaternion.copy(cam.quaternion);
      this.ship.visible = true;
      this.speed = 4; this.throttle = this.touch ? .5 : .35;
      this.onMode(true);
      document.body.classList.add('piloting');
      this.hud('pilot-hud').hidden = false;
      clearTimeout(this.helpT);
      this.hud('hud-help').classList.add('on');
      this.helpT = setTimeout(() => this.hud('hud-help').classList.remove('on'), 9000);
    }
    const s = targetId && this.systems.find(s => s.p.id === targetId);
    this.setTarget(s || this.nearest(true));
    this.setAutopilot(!!s);
  }

  exitPilot() {
    if (!this.pilot) return;
    this.pilot = false; this.autopilot = false; this.keys.clear(); this.stick = null;
    document.body.classList.remove('piloting');
    this.hud('pilot-hud').hidden = true;
    this.onMode(false);
  }

  nearest(liveOnly) {
    let best = null;
    for (const s of this.systems) {
      if (liveOnly && !s.p.live) continue;
      s.g.getWorldPosition(s.world);
      const d = s.world.distanceTo(this.ship.position);
      if (!best || d < best.d) best = { s, d };
    }
    return best && best.s;
  }

  setTarget(s) {
    this.target = s;
    if (!s) return;
    this.hud('hud-target-name').textContent = s.p.name;
    this.hud('hud-target-kind').textContent = (s.p.live ? 'Live · ' : 'Dormant · ') + s.p.kind;
    this.hud('hud-marker-name').textContent = s.p.name;
  }
  cycleTarget() {
    const i = this.systems.indexOf(this.target);
    this.setTarget(this.systems[(i + 1) % this.systems.length]);
  }
  setAutopilot(on) {
    this.autopilot = on;
    this.hud('hud-auto').classList.toggle('on', on);
  }
  interact() {
    const s = this.docked;
    if (!s) return;
    if (s.p.live) window.open(s.p.href, '_blank', 'noopener');
    else { this.exitPilot(); this.onOpenDormant(s.p.id); }
  }

  updatePilot(dt) {
    const k = this.keys, ship = this.ship;
    const dz = v => Math.abs(v) < .08 ? 0 : (v - Math.sign(v) * .08) / .92;
    let sx = 0, sy = 0;
    if (this.stick) { sx = this.stick.dx; sy = this.stick.dy; }
    else if (!this.touch && !this.autopilot && !this.overHud) { sx = dz(this.px); sy = dz(this.py); }
    let yaw = -sx * 1.4, pitch = -sy * 1.05, roll = 0;
    if (k.has('arrowleft')) yaw += 1.2;
    if (k.has('arrowright')) yaw -= 1.2;
    if (k.has('arrowup')) pitch -= .9;
    if (k.has('arrowdown')) pitch += .9;
    if (k.has('a') || k.has('q')) roll += 1.6;
    if (k.has('d')) roll -= 1.6;
    if (k.has('w')) this.throttle = Math.min(1, this.throttle + dt * .6);
    if (k.has('s')) this.throttle = Math.max(0, this.throttle - dt * .6);

    // autopilot and the galaxy edge both turn the ship toward a point
    const fromCore = ship.position.length();
    let steerTo = null;
    if (this.autopilot && this.target) {
      steerTo = this.target.world;
      const d = steerTo.distanceTo(ship.position);
      this.throttle = d > 40 ? .9 : Math.max(.12, d / 45);
      if (d < 9) this.setAutopilot(false);
    }
    const edge = fromCore > 235;
    if (edge) steerTo = _v2.set(0, 0, 0);
    this.hud('hud-warn').classList.toggle('on', edge);
    if (steerTo) {
      _m.lookAt(ship.position, steerTo, _v.set(0, 1, 0).applyQuaternion(ship.quaternion));
      _q.setFromRotationMatrix(_m);
      ship.quaternion.rotateTowards(_q, dt * (edge ? .9 : 1.3));
    }

    ship.quaternion.multiply(_q.setFromAxisAngle(AY, yaw * dt));
    ship.quaternion.multiply(_q.setFromAxisAngle(AX, pitch * dt));
    ship.quaternion.multiply(_q.setFromAxisAngle(AZ, roll * dt));
    ship.quaternion.normalize();

    const boost = k.has('shift') || k.has(' ');
    const want = this.throttle * 26 * (boost ? 2.4 : 1);
    this.speed += (want - this.speed) * (1 - Math.exp(-dt * 1.6));
    ship.translateZ(-this.speed * dt);

    // bank into turns; purely visual
    this.shipBody.rotation.z += (yaw * .45 - this.shipBody.rotation.z) * (1 - Math.exp(-dt * 4));
    this.shipBody.rotation.x += (pitch * .12 - this.shipBody.rotation.x) * (1 - Math.exp(-dt * 4));
    const fl = .5 + this.speed / 22 + Math.sin(this.time * 40) * .06;
    this.flames.forEach(f => f.scale.set(fl * .9, fl * .9, 1));
    this.tipLights.forEach((s, i) => s.material.opacity = Math.sin(this.time * 4 + i * Math.PI) > .3 ? 1 : .15);

    const cam = this.camera, ease = 1 - Math.exp(-dt * 5);
    _v.set(0, 1.25, 6.4 + this.speed * .035).applyQuaternion(ship.quaternion).add(ship.position);
    cam.position.lerp(_v, ease);
    _v.set(0, .5, -10).applyQuaternion(ship.quaternion).add(ship.position);
    this.look.lerp(_v, ease * 1.4);
    cam.up.lerp(_v2.set(0, 1, 0).applyQuaternion(ship.quaternion), ease).normalize();
    cam.lookAt(this.look);
    const fov = 58 + Math.max(0, this.speed - 26) * .35;
    if (Math.abs(cam.fov - fov) > .05) { cam.fov += (fov - cam.fov) * ease; cam.updateProjectionMatrix(); }

    this.updateStreaks(dt);
    this.updatePilotHud();
  }

  updateStreaks(dt) {
    const sp = this.pilot ? this.speed : 0, pos = this.streaks.geometry.attributes.position;
    const len = .3 + sp * .09;
    this.streakData.forEach((s, i) => {
      s.z += sp * dt * 1.4;
      if (s.z > 6) this.resetStreak(s);
      pos.setXYZ(i * 2, s.x, s.y, s.z); pos.setXYZ(i * 2 + 1, s.x, s.y, s.z - len);
    });
    pos.needsUpdate = true;
    this.streaks.material.opacity = Math.min(.55, Math.max(0, (sp - 14) / 40));
  }

  updatePilotHud() {
    let near = null;
    for (const s of this.systems) {
      s.dist = s.world.distanceTo(this.ship.position);
      if (!near || s.dist < near.dist) near = s;
    }
    const docked = near && near.dist < 10 ? near : null;
    if (docked !== this.docked) {
      this.docked = docked;
      const el = this.hud('hud-dock');
      el.classList.toggle('on', !!docked);
      if (docked) {
        const p = docked.p;
        el.classList.toggle('dormant', !p.live);
        this.hud('dock-kind').textContent = (p.live ? 'Live · ' : 'Dormant · ') + p.kind;
        this.hud('dock-name').textContent = p.name;
        this.hud('dock-text').textContent = p.text;
        this.hud('dock-go').textContent = p.live ? `Open ${p.host} ↗` : 'Offline for now. See it in Work →';
      }
    }
    this.hud('hud-speed').textContent = (this.speed / 60).toFixed(2) + 'c';
    this.hud('hud-speed-bar').style.transform = `scaleX(${Math.min(1, this.speed / 62)})`;
    this.hud('hud-throttle').style.transform = `scaleX(${this.throttle})`;

    const t = this.target;
    const marker = this.hud('hud-marker'), arrow = this.hud('hud-arrow');
    if (!t) { marker.style.opacity = arrow.style.opacity = 0; return; }
    this.hud('hud-target-dist').textContent = (t.dist * .42).toFixed(1) + ' ly';
    _v.copy(t.world).project(this.camera);
    const behind = _v.z > 1;
    const W = innerWidth, H = innerHeight;
    const on = !behind && Math.abs(_v.x) < .92 && Math.abs(_v.y) < .9;
    if (on) {
      marker.style.opacity = t === docked ? 0 : 1; arrow.style.opacity = 0;
      marker.style.transform = `translate(${(_v.x + 1) / 2 * W}px, ${(1 - _v.y) / 2 * H}px)`;
      this.hud('hud-marker-dist').textContent = (t.dist * .42).toFixed(1) + ' ly';
    } else {
      let x = _v.x, y = _v.y;
      if (behind) { x = -x; y = -y; }
      const a = Math.atan2(y, x), m = Math.max(Math.abs(Math.cos(a)) / .9, Math.abs(Math.sin(a)) / .82);
      marker.style.opacity = 0; arrow.style.opacity = 1;
      arrow.style.transform = `translate(${(Math.cos(a) / m + 1) / 2 * W}px, ${(1 - Math.sin(a) / m) / 2 * H}px) rotate(${-a}rad)`;
    }
  }

  // ---------- story mode ----------
  updateStory(dt) {
    this.chapterSmooth += (this.chapter - this.chapterSmooth) * (1 - Math.exp(-dt * 2.4));
    const u = Math.min(1, Math.max(0, this.chapterSmooth / 5));
    this.pathPos.getPoint(u, _v); this.pathLook.getPoint(u, _v2);
    const drift = this.reduce ? 0 : 1;
    _v.x += this.px * 5 * drift; _v.y += (-this.py * 3.5 + Math.sin(this.time * .25) * 1.2) * drift;
    const cam = this.camera, ease = 1 - Math.exp(-dt * 2.6);
    cam.position.lerp(_v, ease);
    this.look.lerp(_v2, ease);
    cam.up.lerp(UP, ease).normalize();
    cam.lookAt(this.look);
    if (Math.abs(cam.fov - 55) > .05) { cam.fov += (55 - cam.fov) * ease; cam.updateProjectionMatrix(); }
    if (this.ship.visible && cam.position.distanceTo(this.ship.position) > 60) this.ship.visible = false;
    this.updateStreaks(dt);
  }

  updateLabels() {
    if (!this.labelLayer) return;
    const show = this.pilot ? 1 : Math.max(0, 1 - this.chapterSmooth * 3);
    // beacons and labels belong to the hero and to flight; they would cut through the reading chapters
    for (const s of this.systems) if (s.beam) s.beam.material.opacity = this.pilot ? 1 : Math.max(show, (this.chapterSmooth - 4.4) * 1.6);
    this.labelLayer.style.opacity = show;
    this.labelLayer.style.visibility = show > .02 ? 'visible' : 'hidden';
    if (show <= .02) return;
    const W = innerWidth, H = innerHeight;
    for (const s of this.systems) {
      if (!this.pilot) s.g.getWorldPosition(s.world);
      _v.copy(s.world).project(this.camera);
      const d = this.pilot ? s.dist : 0;
      const vis = _v.z < 1 && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05 && d < 170 && s !== this.docked && !(this.pilot && s === this.target);
      s.label.style.display = vis ? '' : 'none';
      if (vis) s.label.style.transform = `translate(${(_v.x + 1) / 2 * W}px, ${(1 - _v.y) / 2 * H}px)`;
    }
  }

  tick() {
    const now = performance.now(), dt = Math.min((now - this.last) / 1000, .05);
    this.last = now; this.time += dt;
    const spin = this.reduce ? 0 : this.pilot ? .003 : .014;
    this.galaxy.rotation.y += dt * spin;
    this.coreSpin.rotation.y += dt * spin * 1.6;
    for (const l of this.layers) l.material.uniforms.uTime.value = this.time;
    for (const s of this.systems) {
      s.rings.forEach((r, i) => { const a = r.phase + this.time * r.speed; s.planets[i].position.set(Math.cos(a) * r.R, 0, Math.sin(a) * r.R); });
      if (s.p.live) s.halo.scale.setScalar(9 + Math.sin(this.time * 2 + s.rings[0].phase) * .8);
      if (this.pilot) s.g.getWorldPosition(s.world);
    }
    if (this.pilot) this.updatePilot(dt); else this.updateStory(dt);
    this.sky.position.copy(this.camera.position);
    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  }
}
