// Everything the site says about you lives here. Edit this file, not the HTML.
// Values marked TODO are placeholders: they are hidden or shown softly until you fill them in.

export const PROFILE = {
  name: 'Laziz Raimqulov',
  first: 'Laziz',
  role: 'Developer · 3D designer',
  city: 'Tashkent, Uzbekistan',
  timezone: 'Asia/Tashkent',
  university: 'WIUT',
  major: '', // TODO e.g. 'BSc Business Information Systems'
  birthDate: '', // TODO 'YYYY-MM-DD'; age is calculated from it, hidden while empty
  photo: 'assets/me.jpg', // TODO add your photo here; initials are shown until it exists
  status: 'Open to internships & freelance work',
  cv: '', // TODO 'assets/cv.pdf' shows a "Download CV" button in the briefing
};

export const CONTACTS = [
  { id: 'email', label: 'Email', handle: 'raimkulovlaziz@gmail.com', href: 'mailto:raimkulovlaziz@gmail.com' },
  { id: 'github', label: 'GitHub', handle: '@username', href: 'https://github.com/' }, // TODO
  { id: 'telegram', label: 'Telegram', handle: '@username', href: 'https://t.me/' }, // TODO
  { id: 'linkedin', label: 'LinkedIn', handle: 'in/username', href: 'https://www.linkedin.com/' }, // TODO
];

// Chapter 01. `unlocked` lists skill ids picked up at each stop; they link the story to the toolkit.
export const TIMELINE = [
  {
    id: 'lyceum',
    when: 'Lyceum',
    place: 'Academic lyceum',
    title: 'The spark',
    text: 'Somewhere between classes I started asking how the apps and games I used were actually made. I wanted to build them, not only use them.',
    unlocked: [],
  },
  {
    id: 'sensorica',
    when: 'Sensorica',
    place: 'Sensorica IT learning center',
    title: 'Two courses, two directions',
    text: 'I finished two courses here: 3D modeling and Frontend development. One taught me to think in space, the other to put things on the web. I never chose between them.',
    unlocked: ['3dsmax', 'html', 'css', 'js'],
  },
  {
    id: 'itpark',
    when: 'IT Park',
    place: 'IT Park University',
    title: 'Going deeper',
    text: 'One year of university-level computer science. Programming stopped being a hobby and turned into a discipline.',
    unlocked: ['python', 'django', 'csharp'],
  },
  {
    id: 'wiut',
    when: 'Now',
    place: 'Westminster International University in Tashkent',
    title: 'Building for real people',
    text: 'Now I build things other people actually use: the Finance Club website, an exam prep tool my classmates used before their midterm, and 3D experiments that run in a browser.',
    unlocked: ['firebase', 'three', 'cv'],
  },
];

// Chapter 02
export const SKILL_GROUPS = [
  { id: 'web', name: 'Web', blurb: 'Where most of my work ends up.', hue: 215 },
  { id: 'cloud', name: 'Backend & cloud', blurb: 'Getting things online and keeping them there.', hue: 265 },
  { id: '3d', name: '3D', blurb: 'Space, light and objects you can walk around.', hue: 190 },
  { id: 'machines', name: 'Machines', blurb: 'Code that sees, and code that moves.', hue: 320 },
];

export const SKILLS = [
  { id: 'html', name: 'HTML', group: 'web' },
  { id: 'css', name: 'CSS', group: 'web' },
  { id: 'js', name: 'JavaScript', group: 'web' },
  { id: 'firebase', name: 'Firebase', group: 'cloud' },
  { id: 'python', name: 'Python', group: 'cloud' },
  { id: 'django', name: 'Django', group: 'cloud' },
  { id: 'three', name: 'three.js', group: '3d' },
  { id: '3dsmax', name: '3ds Max', group: '3d' },
  { id: 'cv', name: 'Computer vision', group: 'machines' },
  { id: 'csharp', name: 'Robotics (C#)', group: 'machines', note: 'a little' },
];

// Chapter 03. `live` projects get a link and a bright star; the rest are dormant until deployed.
// `star` places the project in the galaxy: r = distance from the core, a = angle in degrees, y = height.
export const PROJECTS = [
  {
    id: 'finance-club',
    name: 'Finance Club',
    kind: 'Website',
    live: true,
    href: 'https://financeclub.uz/',
    host: 'financeclub.uz',
    text: "The website for my university's Finance Club: events, the team, and the Economics Olympiad 2026, with sign-ups through Telegram.",
    skills: ['html', 'css', 'js', 'firebase'],
    hue: 215,
    star: { r: 34, a: 20, y: 2 },
  },
  {
    id: 'study-hub',
    name: 'WIUT Study Hub',
    kind: 'Exam prep tool',
    live: true,
    href: 'https://wiut-study-l.web.app',
    host: 'wiut-study-l.web.app',
    text: 'An exam preparation tool for WIUT students. My classmates used it to get ready for the statistics midterm.',
    skills: ['html', 'css', 'js', 'firebase'],
    hue: 270,
    star: { r: 48, a: 150, y: -3 },
  },
  {
    id: 'wiut-3d',
    name: '3D WIUT',
    kind: 'Interactive 3D',
    live: false,
    text: 'A 3D model of the WIUT campus you can walk through in the browser, built for students who have never been inside.',
    skills: ['three', '3dsmax', 'js'],
    hue: 190,
    star: { r: 58, a: 255, y: 4 },
  },
  {
    id: 'projects-manager',
    name: 'Projects Manager',
    kind: 'Desktop app',
    live: false,
    text: 'A desktop app that sorts all my local projects into groups and opens any of them with one click. Built with Electron.',
    skills: ['js', 'html', 'css'],
    hue: 160,
    star: { r: 70, a: 60, y: -2 },
  },
  {
    id: 'home-designer',
    name: '3D Home Designer',
    kind: 'Interactive 3D',
    live: false,
    text: 'Plan an interior in 3D: place furniture, change materials and walk through the room before anything is bought.',
    skills: ['three', '3dsmax', 'js'],
    hue: 30,
    star: { r: 26, a: 300, y: -1 },
  },
  {
    id: 'holograms',
    name: 'Vision & holograms',
    kind: 'Computer vision',
    live: false,
    text: 'Experiments where a webcam understands your hands: an "air mouse" you control by pinching in mid-air, and holographic HUD interfaces.',
    skills: ['python', 'cv'],
    hue: 320,
    star: { r: 82, a: 335, y: 5 },
  },
  {
    id: 'code-notes',
    name: 'Code Notes',
    kind: 'Web app',
    live: false,
    text: "A note-taking app for my code notes: snippets, explanations and the things I don't want to search for twice.",
    skills: ['js', 'html', 'css'],
    hue: 45,
    star: { r: 42, a: 95, y: 3 },
  },
];

export const HOBBIES = []; // TODO e.g. ['Photography', 'Chess']; the row is hidden while empty

// Chapter 04, the 3D museum. Put images in assets/gallery/ and list them here.
// Entries without `src` get generated artwork so the museum never looks empty.
export const GALLERY = [
  { title: 'First light', caption: 'Placeholder: add a photo in js/data.js' },
  { title: 'Tashkent, late', caption: 'Placeholder: add a photo in js/data.js' },
  { title: 'Signal', caption: 'Placeholder: add a photo in js/data.js' },
  { title: 'Blue hour', caption: 'Placeholder: add a photo in js/data.js' },
  { title: 'Static', caption: 'Placeholder: add a photo in js/data.js' },
  { title: 'Orbit', caption: 'Placeholder: add a photo in js/data.js' },
  { title: 'Small worlds', caption: 'Placeholder: add a photo in js/data.js' },
  { title: 'Drift', caption: 'Placeholder: add a photo in js/data.js' },
  { title: 'Night shift', caption: 'Placeholder: add a photo in js/data.js' },
  { title: 'Bloom', caption: 'Placeholder: add a photo in js/data.js' },
  { title: 'Long exposure', caption: 'Placeholder: add a photo in js/data.js' },
  { title: 'Home', caption: 'Placeholder: add a photo in js/data.js' },
  // { src: 'assets/gallery/01.jpg', title: 'Title', caption: 'Where and when' },
];

export function age() {
  if (!PROFILE.birthDate) return null;
  const b = new Date(PROFILE.birthDate), n = new Date();
  return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
}
