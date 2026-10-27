import { PROFILE, CONTACTS, TIMELINE, SKILL_GROUPS, SKILLS, PROJECTS, HOBBIES, GALLERY, age } from './data.js';
import { makeArt } from './art.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const skill = id => SKILLS.find(s => s.id === id);
const group = id => SKILL_GROUPS.find(g => g.id === id);
const pad = n => String(n).padStart(2, '0');
const touch = matchMedia('(hover: none)').matches;
const CHAPTERS = ['Who', 'Origin', 'Toolkit', 'Work', 'Museum', 'Contact'];
let space = null, lenis = null;

// ---------- 00½ boarding pass ----------
{
  const a = age();
  const fields = [
    ['Passenger', esc(PROFILE.name)],
    ['Class', esc(PROFILE.role)],
    ['Studying', PROFILE.major ? `${esc(PROFILE.major)} · ${esc(PROFILE.university)}` : esc(PROFILE.university)],
    a && ['Age', a],
    ['Status', `<span class="ok"><i class="status-dot"></i>${esc(PROFILE.status)}</span>`],
  ].filter(Boolean);
  $('#pass-grid').innerHTML = fields.map(([k, v], i) => `<span class="${i === fields.length - 1 ? 'wide' : ''}"><small class="mono">${k}</small><b>${v}</b></span>`).join('');
  $('#pass-year').textContent = new Date().getFullYear();
  // barcode bars derived from the name, so it stays the same on every visit
  let seed = [...PROFILE.name].reduce((h, c) => h * 31 + c.charCodeAt(0) >>> 0, 7), x = 0, bars = '';
  while (x < 116) {
    seed = Math.imul(seed, 1103515245) + 12345 >>> 0;
    const w = 1 + seed % 3;
    if (seed >> 8 & 1) bars += `<rect x="${x}" width="${w}" height="40"/>`;
    x += w + 1;
  }
  $('#pass-barcode').innerHTML = `<svg viewBox="0 0 116 40" preserveAspectRatio="none">${bars}</svg>`;
  if (PROFILE.photo) {
    const img = new Image();
    img.alt = PROFILE.name;
    img.onload = () => { const p = $('#pass-photo'); p.appendChild(img); p.hidden = false; };
    img.src = PROFILE.photo;
  }
  const pass = $('#pass');
  if (!touch) {
    pass.addEventListener('pointermove', e => {
      const r = pass.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      pass.style.setProperty('--mx', px * 100 + '%'); pass.style.setProperty('--my', py * 100 + '%');
      pass.style.transform = `perspective(1100px) rotateX(${(.5 - py) * 7}deg) rotateY(${(px - .5) * 9}deg)`;
    });
    pass.addEventListener('pointerleave', () => { pass.style.transform = ''; });
  }
}

// ---------- 01 origin ----------
const route = $('#route');
TIMELINE.forEach((t, i) => {
  const li = document.createElement('li');
  li.className = 'stop reveal' + (i === TIMELINE.length - 1 ? ' now' : '');
  const chips = t.unlocked.map(id => `<button class="chip" data-skill="${id}">${esc(skill(id).name)}</button>`).join('');
  li.innerHTML = `
    <div class="when mono">Stop ${pad(i + 1)} <span>· ${esc(t.when)}</span></div>
    <h3>${esc(t.title)}</h3>
    <div class="place">${esc(t.place)}</div>
    <p>${esc(t.text)}</p>
    ${chips ? `<div class="unlocked"><span class="mono">Unlocked</span>${chips}</div>` : ''}`;
  route.appendChild(li);
});
route.addEventListener('click', e => {
  const b = e.target.closest('[data-skill]');
  if (!b) return;
  scrollToEl($('#toolkit'));
  setTimeout(() => inspect(b.dataset.skill), 500);
});

// ---------- 02 toolkit ----------
const systems = $('#systems');
SKILL_GROUPS.forEach((g, i) => {
  const d = document.createElement('div');
  d.className = 'system reveal';
  d.style.setProperty('--h', g.hue);
  d.style.setProperty('--d', i * .08 + 's');
  d.dataset.group = g.id;
  d.innerHTML = `<div class="orb"></div><h3>${esc(g.name)}</h3><p class="blurb">${esc(g.blurb)}</p>
    <div class="chips">${SKILLS.filter(s => s.group === g.id).map(s => `<button class="chip skill" data-skill="${s.id}">${esc(s.name)}${s.note ? ` <small>${esc(s.note)}</small>` : ''}</button>`).join('')}</div>`;
  systems.appendChild(d);
});

function inspect(id) {
  const s = skill(id);
  if (!s) return;
  const from = TIMELINE.find(t => t.unlocked.includes(id));
  const used = PROJECTS.filter(p => p.skills.includes(id));
  $('#ins-name').textContent = s.name;
  $('#ins-from').textContent = from ? from.place : 'Self-taught along the way';
  $('#ins-used').innerHTML = used.length ? used.map(p => `<a href="#p-${p.id}" data-proj="${p.id}">${esc(p.name)}</a>`).join(', ') : 'Coursework and experiments so far';
  $('#inspector').classList.add('has');
  $$('.skill').forEach(b => b.classList.toggle('on', b.dataset.skill === id));
  $$('.system').forEach(el => el.classList.toggle('dim', el.dataset.group !== s.group));
  $$('.proj .chip').forEach(c => c.classList.toggle('hl', c.dataset.skill === id));
}
systems.addEventListener('pointerover', e => { const b = e.target.closest('.skill'); if (b && !touch) inspect(b.dataset.skill); });
systems.addEventListener('click', e => { const b = e.target.closest('.skill'); if (b) inspect(b.dataset.skill); });
systems.addEventListener('pointerleave', () => $$('.system').forEach(el => el.classList.remove('dim')));
$('#inspector').addEventListener('click', e => {
  const a = e.target.closest('[data-proj]');
  if (a) { e.preventDefault(); showProject(a.dataset.proj); }
});

// ---------- 03 work ----------
const projects = $('#projects');
PROJECTS.forEach((p, i) => {
  const a = document.createElement('article');
  a.className = 'proj reveal' + (p.live ? ' live' : '');
  a.id = 'p-' + p.id;
  a.dataset.live = p.live ? 'live' : 'dormant';
  a.style.setProperty('--h', p.hue);
  a.style.setProperty('--d', (i % 3) * .07 + 's');
  a.innerHTML = `
    <div class="planet"></div>
    <div class="top mono"><span>${pad(i + 1)} · ${esc(p.kind)}</span><span class="state">${p.live ? '<i class="status-dot"></i>Online' : '<i></i>Dormant'}</span></div>
    <div class="body">
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.text)}</p>
      <div class="chips">${p.skills.map(id => `<span class="chip" data-skill="${id}">${esc(skill(id).name)}</span>`).join('')}</div>
      <div class="acts">
        ${p.live ? `<a class="act go" href="${p.href}" target="_blank" rel="noopener">Open ${esc(p.host)} ↗</a>` : ''}
        <button class="act fly" data-fly="${p.id}">✦ Find in galaxy</button>
      </div>
    </div>`;
  projects.appendChild(a);
});
{
  const n = document.createElement('article');
  n.className = 'proj next-star reveal';
  n.dataset.live = 'dormant';
  n.style.setProperty('--h', 220);
  n.innerHTML = `<div class="top mono"><span>${pad(PROJECTS.length + 1)} · Uncharted</span><span>· · ·</span></div>
    <div class="body"><h3>Next star</h3><p>Something new is being built. It lights up here, and in the galaxy, the day it goes live.</p></div>`;
  projects.appendChild(n);
}
const counts = { all: PROJECTS.length, live: PROJECTS.filter(p => p.live).length };
counts.dormant = counts.all - counts.live;
$$('#filters button').forEach(b => {
  b.querySelector('span').textContent = pad(counts[b.dataset.f]);
  b.addEventListener('click', () => {
    $$('#filters button').forEach(x => x.classList.toggle('on', x === b));
    $$('.proj').forEach(c => c.classList.toggle('hide', b.dataset.f !== 'all' && c.dataset.live !== b.dataset.f));
  });
});
projects.addEventListener('click', e => {
  const f = e.target.closest('[data-fly]');
  if (f && space) space.enterPilot(f.dataset.fly);
});
if (!touch) {
  projects.addEventListener('pointermove', e => {
    const c = e.target.closest('.proj');
    if (!c) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
    c.style.transform = `perspective(900px) rotateX(${(.5 - y) * 4}deg) rotateY(${(x - .5) * 5}deg)`;
  });
  projects.addEventListener('pointerout', e => {
    const c = e.target.closest('.proj');
    if (c && !c.contains(e.relatedTarget)) c.style.transform = '';
  });
}
function showProject(id) {
  const c = $('#p-' + id);
  if (!c) return;
  c.classList.remove('hide');
  scrollToEl(c, { center: true });
  c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash');
}

// ---------- 04 museum teaser ----------
{
  const car = $('#carousel'), items = GALLERY.slice(0, 10), n = items.length || 1, r = Math.max(260, n * 34);
  items.forEach((g, i) => {
    const f = document.createElement('div');
    f.className = 'frame';
    f.style.transform = `rotateY(${i / n * 360}deg) translateZ(${r}px)`;
    f.style.backgroundImage = `url(${g.src || makeArt(i, 240, 310).toDataURL('image/jpeg', .8)})`;
    f.innerHTML = `<span>${esc(g.title || '')}</span>`;
    car.appendChild(f);
  });
  if (HOBBIES.length) {
    $('#hobbies').hidden = false;
    $('#hobby-list').innerHTML = HOBBIES.map(h => `<span class="chip">${esc(h)}</span>`).join('');
  }
}

// ---------- 05 contact ----------
const ICONS = {
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  telegram: '<path d="M21.5 3.5 2.5 11l7 2.5 2.5 7 9.5-17Z"/><path d="m9.5 13.5 12-10"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V17M8 7.5v.01M12 17v-6.5M12 13.5a2.5 2.5 0 0 1 5 0V17"/>',
};
const icon = id => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[id] || ''}</svg>`;
const email = CONTACTS.find(c => c.id === 'email');
$('#channels').innerHTML = CONTACTS.map(c => `
  <a class="channel" href="${c.href}" ${c.id === 'email' ? '' : 'target="_blank" rel="noopener"'}>
    <span class="ic">${icon(c.id)}</span>
    <span><span class="lb mono">${esc(c.label)}</span><div class="hd">${esc(c.handle)}</div></span>
    <span class="ar mono">${c.id === 'email' ? '<button class="copy" data-copy type="button">Copy</button>' : ''}<span>↗</span></span>
  </a>`).join('');
$('#channels').addEventListener('click', async e => {
  if (!e.target.closest('[data-copy]')) return;
  e.preventDefault();
  try { await navigator.clipboard.writeText(email.handle); toast('Email copied'); } catch { toast(email.handle); }
});

const form = $('#transmit'), status = $('#tx-status');
form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  // bots fill the hidden field; let them think it worked
  if (data.website) { form.reset(); status.className = 'tx-status mono ok'; status.textContent = 'Transmission received. I will reply soon.'; return; }
  let ok = true;
  for (const f of form.elements) if (f.name && f.name !== 'website') {
    const bad = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
    f.classList.toggle('bad', bad); ok = ok && !bad;
  }
  if (!ok) { status.className = 'tx-status mono'; status.textContent = 'Check the highlighted fields'; return; }
  form.classList.add('sending');
  status.className = 'tx-status mono'; status.textContent = 'Encoding signal…';
  try {
    const { sendMessage } = await import('./firebase.js');
    status.textContent = 'Transmitting…';
    await sendMessage(data);
    status.className = 'tx-status mono ok'; status.textContent = 'Transmission received. I will reply soon.';
    form.reset();
  } catch (err) {
    console.warn('Message not sent', err);
    status.innerHTML = `Signal lost. Try again, or email me at <a href="${email.href}">${esc(email.handle)}</a>.`;
  }
  form.classList.remove('sending');
});
form.addEventListener('input', e => e.target.classList.remove('bad'));
// warm up the Firebase SDK while the visitor is still typing
form.addEventListener('focusin', () => import('./firebase.js').catch(() => {}), { once: true });

{
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: PROFILE.timezone, hour: '2-digit', minute: '2-digit' });
  const tick = () => { $('#clock').textContent = `It's ${fmt.format(new Date())} in Tashkent`; };
  tick(); setInterval(tick, 20000);
  $('#year').textContent = new Date().getFullYear();
}

// ---------- briefing ----------
const brief = $('#briefing');
{
  const a = age();
  $('#br-name').textContent = PROFILE.name;
  $('#br-status').textContent = (a ? `${a} years old · ` : '') + PROFILE.status;
  const past = TIMELINE.filter(t => t.id !== 'wiut' && t.id !== 'lyceum').map(t => t.id === 'sensorica' ? 'Sensorica IT: 3D modeling and Frontend courses' : t.id === 'itpark' ? 'IT Park University (1 year)' : t.place);
  const rows = [
    ['Studying', `${PROFILE.major ? esc(PROFILE.major) + ', ' : ''}Westminster International University in Tashkent`],
    ['Before that', past.map(esc).join('<br>')],
    ['Stack', SKILLS.map(s => esc(s.name)).join(', ')],
    ['Live work', PROJECTS.filter(p => p.live).map(p => `<a href="${p.href}" target="_blank" rel="noopener">${esc(p.name)} ↗</a>`).join('<br>')],
    ['Also built', PROJECTS.filter(p => !p.live).map(p => esc(p.name)).join(', ')],
    ['Contact', CONTACTS.map(c => `<a href="${c.href}" ${c.id === 'email' ? '' : 'target="_blank" rel="noopener"'}>${esc(c.label)}</a>`).join(' · ')],
  ];
  $('#br-list').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  $('#br-actions').innerHTML = `<a class="btn primary" href="#origin" data-close>Start the journey <span>↓</span></a>
    <button class="btn" data-close data-pilot>✦ Pilot the ship</button>
    <a class="btn ghost" href="${email.href}">Email me ↗</a>
    ${PROFILE.cv ? `<a class="btn ghost" href="${PROFILE.cv}" download>Download CV ↓</a>` : ''}`;
}
$$('[data-brief]').forEach(b => b.addEventListener('click', () => brief.showModal()));
brief.addEventListener('click', e => { if (e.target === brief || e.target.closest('[data-close]')) brief.close(); });
brief.addEventListener('close', () => lenis && lenis.start());
$$('[data-brief]').forEach(b => b.addEventListener('click', () => lenis && lenis.stop()));

// ---------- chapters, nav, reveal ----------
const chapters = $$('.chapter');
const ticks = $('#ch-ticks');
ticks.innerHTML = chapters.map((c, i) => `<a href="#${c.id}" aria-label="${CHAPTERS[i]}"></a>`).join('');
const tickEls = $$('a', ticks), navLinks = $$('nav .links a');
const veil = $('#veil'), nav = $('#nav'), fill = $('#route-fill'), stops = $$('.stop');
const layoutTop = el => { let y = 0; for (; el; el = el.offsetParent) y += el.offsetTop; return y; };
// the route fills up to this line on screen: 60% down, but never so low that stop two
// is already lit when the Origin section first reaches the top
const fillLine = () => Math.min(innerHeight * .6, layoutTop(route) - layoutTop($('#origin')) + (stops[1] ? stops[1].offsetTop : 0) - 30);
let lastCh = -1;

function onScroll() {
  const H = innerHeight;
  // each chapter's camera move plays while its top travels from 85% to 25% of the viewport
  let ch = 0;
  for (let i = 1; i < chapters.length; i++) ch += Math.min(1, Math.max(0, (H * .85 - chapters[i].getBoundingClientRect().top) / (H * .6)));
  space && space.setChapter(ch);
  veil.style.opacity = Math.min(1, ch) * .72;
  $('#chapters').classList.toggle('away', ch < .5 || ch > 4.5);
  nav.classList.toggle('scrolled', scrollY > 40);
  $('#labels').classList.toggle('off', scrollY > H * .35);

  const cur = Math.min(chapters.length - 1, Math.floor(ch + .35));
  if (cur !== lastCh) {
    lastCh = cur;
    $('#ch-num').textContent = pad(cur);
    $('#ch-name').textContent = CHAPTERS[cur];
    tickEls.forEach((t, i) => { t.classList.toggle('on', i === cur); t.classList.toggle('past', i < cur); });
    navLinks.forEach(a => a.classList.toggle('on', +a.dataset.ch === cur));
  }

  const r = route.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, (fillLine() - r.top) / r.height));
  fill.style.transform = `scaleY(${p})`;
  stops.forEach(s => s.classList.toggle('lit', p > 0 && (s.offsetTop + 10) / route.offsetHeight <= p + .01));
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);

// ---------- smooth scrolling ----------
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function scrollToEl(el, { center = false } = {}) {
  const r = el.getBoundingClientRect();
  // short sections and requested targets sit in the middle of the screen, long ones start at the top
  const top = scrollY + r.top - (center || r.height < innerHeight * .85 ? Math.max(0, (innerHeight - r.height) / 2) : 0);
  scrollToY(top);
}
function scrollToY(y, duration = 1.3) {
  y = Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight));
  if (lenis) { if (!(space && space.pilot)) lenis.start(); lenis.scrollTo(y, { duration, easing: easeInOut, force: true }); }
  else scrollTo({ top: y, behavior: 'smooth' });
}
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  import('https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.mjs').then(({ default: Lenis }) => {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    if (space && space.pilot) lenis.stop();
  }).catch(err => console.warn('Smooth scrolling unavailable', err));
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.defaultPrevented || a.getAttribute('href') === '#') return;
  const el = document.querySelector(a.getAttribute('href'));
  if (!el) return;
  e.preventDefault();
  if (a.hasAttribute('data-close') && brief.open) brief.close();
  scrollToEl(el);
});

// Space glides to the next stop of the story (Shift+Space goes back). Long sections are paged through first.
const STOPS = ['#hero', '#boarding', '#origin', '#toolkit', '#work', '#gallery', '#contact'].map(s => $(s));
// where Space can land: each section, plus every stop on the origin route
function spaceTargets() {
  // layout positions, so reveal transforms that haven't played yet don't shift the targets
  const H = innerHeight, abs = layoutTop, line = fillLine();
  const ys = [];
  STOPS.forEach(el => {
    const h = el.offsetHeight;
    if (el.id !== 'origin') return ys.push(abs(el) - (h < H * .85 ? (H - h) / 2 : 0));
    // a stop lights up once it crosses the fill line; land so exactly one more is lit each time
    const at = st => Math.max(abs(el), abs(st) - line + 100);
    if (abs(el) < at(stops[0]) - H * .15) ys.push(abs(el)); // phones: the heading sits well above stop one
    stops.forEach(st => ys.push(at(st)));
  });
  ys.sort((p, q) => p - q);
  // landings a few pixels apart feel like a stutter: keep the later one
  return ys.filter((y, i) => i === ys.length - 1 || ys[i + 1] - y > H * .1);
}
// Space is ours unless the visitor is tabbing around (then it should press the focused button)
let tabbing = false;
addEventListener('keydown', e => { if (e.key === 'Tab') tabbing = true; }, true);
addEventListener('pointerdown', () => { tabbing = false; }, true);
addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if ((space && space.pilot) || brief.open) return;
  const t = e.target;
  if (t.closest('input, textarea, select, [contenteditable]')) return;
  if (tabbing && t.closest('button, a')) return;
  e.preventDefault();
  // blur so the keyup can't click whatever was focused (e.g. the ticket after the briefing closes)
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  const H = innerHeight, max = document.documentElement.scrollHeight - H;
  // measure from where an in-flight glide is heading, so quick presses keep advancing
  const y = lenis && lenis.isScrolling ? lenis.targetScroll : scrollY;
  const ys = spaceTargets().map(v => Math.max(0, Math.min(v, max)));
  if (!e.shiftKey) {
    const next = ys.find(v => v > y + 10) ?? max;
    scrollToY(next - y > H * 1.25 ? y + H * .8 : next);
  } else {
    const prev = [...ys].reverse().find(v => v < y - 10) ?? 0;
    scrollToY(y - prev > H * 1.25 ? y - H * .8 : prev);
  }
});

const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const t = e.target;
  t.classList.add('in'); io.unobserve(t);
  // drop the stagger delay once revealed so hover effects respond instantly
  setTimeout(() => t.style.setProperty('--d', '0s'), 1200);
}), { threshold: .12, rootMargin: '0px 0px -5% 0px' });
const startReveals = () => $$('.reveal').forEach(el => io.observe(el));

// ---------- cursor ----------
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const c = $('#cursor');
  let x = -100, y = -100, cx = x, cy = y;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; c.classList.add('on'); });
  document.addEventListener('pointerleave', () => c.classList.remove('on'));
  addEventListener('pointerover', e => c.classList.toggle('hot', !!e.target.closest('a, button, .sys, input, textarea, label')));
  (function loop() {
    cx += (x - cx) * .22; cy += (y - cy) * .22;
    c.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(loop);
  })();
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200);
}

// ---------- galaxy + loader ----------
const loader = $('#loader'), bar = $('#ld-bar'), line = $('#ld-line');
const started = performance.now();
let finished = false;
function finish() {
  if (finished) return;
  finished = true;
  bar.style.transform = 'scaleX(1)';
  loader.classList.add('done');
  startReveals();
  onScroll();
}
loader.addEventListener('click', finish);
setTimeout(finish, 6000); // never leave visitors staring at the loader if the galaxy is slow to start
bar.style.transform = 'scaleX(.3)';

async function boot() {
  try {
    line.textContent = 'Igniting stars';
    const { Space } = await import('./space.js');
    bar.style.transform = 'scaleX(.65)';
    line.textContent = 'Plotting the route';
    await new Promise(r => setTimeout(r, 30));
    space = new Space($('#space'), PROJECTS, {
      labelLayer: $('#labels'),
      onMode: on => { if (on && brief.open) brief.close(); if (lenis) on ? lenis.stop() : lenis.start(); if (!on) onScroll(); },
      onOpenDormant: id => setTimeout(() => showProject(id), 300),
    });
    window.space = space;
  } catch (err) {
    console.warn('Galaxy unavailable, continuing without it.', err);
    document.body.classList.add('no-webgl');
    $$('[data-pilot], [data-fly], .hero-hint').forEach(b => b.remove());
  }
  line.textContent = 'Ready';
  setTimeout(finish, Math.max(0, 1100 - (performance.now() - started)));
}
boot();

$$('[data-pilot]').forEach(b => b.addEventListener('click', () => space && space.enterPilot()));

// pilot HUD wiring
$('#pilot-exit').addEventListener('click', () => space.exitPilot());
$('#hud-next').addEventListener('click', () => space.cycleTarget());
$('#hud-autobtn').addEventListener('click', () => space.setAutopilot(true));
$('#dock-go').addEventListener('click', () => space.interact());
{
  const b = $('#t-boost');
  const on = e => { e.preventDefault(); b.classList.add('held'); space.setPointerBoost(true); };
  const off = () => { b.classList.remove('held'); space && space.setPointerBoost(false); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  const hud = $('#pilot-hud');
  hud.addEventListener('pointerover', e => { if (space) space.overHud = !!e.target.closest('button, .hud-panel'); });
  hud.addEventListener('pointerout', () => { if (space) space.overHud = false; });
}
addEventListener('wheel', e => {
  if (!space || !space.pilot) return;
  space.throttle = Math.min(1, Math.max(0, space.throttle - e.deltaY * .0008));
}, { passive: true });

console.log('%c laziz. %c\nYou opened the console, so you are my kind of person.\nPress P anywhere on the page to fly the ship.', 'background:linear-gradient(90deg,#8ab4ff,#c79bff);color:#04050a;font:700 16px sans-serif;padding:4px 8px;border-radius:4px', 'color:#7c849b');
