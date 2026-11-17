/* The three tickets, as printed objects for the studio to photograph.
   Each ticket is drawn twice on a canvas: once as it is printed (the artwork), and once as a map of its surface,
   which tells the renderer where the stock is matt card and where it is metal foil. The foil then catches the
   light the way real foil does. Stock colours: General Admission takes the look's colour, VIP is black, VVIP is gold. */

const W = 2050, H = 780;                      /* 205 x 78 mm at ten dots to the millimetre */
const GOLD = '#D9B66C', GOLD_FLOOD = '#CBA559', PAPER_INK = '#EFEADF', DARK_INK = '#16120A';
const STOCK = { blue: '#141F47', green: '#12301F' };

export const TIERS = [
  { id: 'ga', a: 'General', b: 'Admission', date: 'Saturday 19 December 2026', venue: 'POWERSCOURT HOTEL  ·  CO. WICKLOW', no: ['No.', 'GA 1912'], photo: '../../uplift/img/e54.jpg', fit: 0.5 },
  { id: 'vip', a: 'VIP', b: 'Experience', date: 'Saturday 19 + Sunday 20 December', venue: 'POWERSCOURT HOTEL  ·  THE ROUND ROOM', no: ['No.', 'VIP 2012'], photo: '../../uplift/img/e55.jpg', fit: 0.5, black: true },
  { id: 'vvip', a: 'VVIP', b: 'Experience', date: 'Friday 18 to Sunday 20 December', venue: 'ALL THREE DAYS  ·  TWENTY SEATS', no: ['No.', 'VVIP 1812'], photo: '../../uplift/img/e60.jpg', fit: 0.35, gold: true },
];

const picture = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

/* surface map: green carries roughness, blue carries metal (three.js reads them from those channels) */
const SURF = { foil: 'rgb(0,72,255)', card: 'rgb(0,205,0)', print: 'rgb(0,150,0)', inkOnFoil: 'rgb(0,235,0)' };

function paint(g, t, look, img, surface) {
  const stock = t.gold ? GOLD_FLOOD : t.black ? '#0B0B0D' : STOCK[look];
  const foil = surface ? SURF.foil : (t.gold ? DARK_INK : GOLD);          /* what the lettering is made of */
  const metal = (colour) => (surface ? (t.gold ? SURF.inkOnFoil : SURF.foil) : (t.gold ? DARK_INK : colour));
  const ink = (colour) => (surface ? (t.gold ? SURF.inkOnFoil : SURF.card) : colour);
  const light = t.gold ? DARK_INK : PAPER_INK;

  g.fillStyle = surface ? (t.gold ? SURF.foil : SURF.card) : stock; g.fillRect(0, 0, W, H);

  /* the photograph, printed on the left third */
  const pw = 700;
  if (surface) { g.fillStyle = SURF.print; g.fillRect(0, 0, pw, H); }
  else {
    const k = Math.max(pw / img.width, H / img.height), dw = img.width * k, dh = img.height * k;
    g.save(); g.beginPath(); g.rect(0, 0, pw, H); g.clip();
    g.filter = 'saturate(.9) contrast(1.05) brightness(1.06)';
    g.drawImage(img, (pw - dw) * t.fit, (H - dh) * 0.5, dw, dh); g.filter = 'none';
    const sh = g.createLinearGradient(0, 0, pw, 0); sh.addColorStop(0, 'rgba(0,0,0,.05)'); sh.addColorStop(1, 'rgba(0,0,0,.34)'); g.fillStyle = sh; g.fillRect(0, 0, pw, H);
    g.restore();
  }
  g.fillStyle = metal(GOLD); g.fillRect(pw, 0, 4, H);

  /* a fine foil keyline round the whole ticket */
  g.strokeStyle = metal(GOLD); g.lineWidth = 3; g.strokeRect(24.5, 24.5, W - 49, H - 49);

  /* the body */
  const x = 772; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = metal(GOLD); g.font = '500 24px "Helvetica Neue", Helvetica, Arial, sans-serif'; g.letterSpacing = '7px';
  g.fillText('A PLAYERS GLOBAL TOUR  ·  DUBLIN', x, 124);
  g.letterSpacing = '0px';
  g.font = '300 184px "Cormorant Garamond", Georgia, serif'; g.fillText(t.a, x - 8, 318);
  g.font = 'italic 300 158px "Cormorant Garamond", Georgia, serif'; g.fillText(t.b, x - 4, 462);
  g.fillStyle = ink(light); g.font = 'italic 400 50px "Cormorant Garamond", Georgia, serif'; g.fillText(t.date, x, 584);
  g.globalAlpha = surface ? 1 : 0.78; g.font = '500 21px "Helvetica Neue", Helvetica, Arial, sans-serif'; g.letterSpacing = '6px'; g.fillText(t.venue, x, 662); g.globalAlpha = 1;

  /* the tear line: a row of small punched dots */
  g.fillStyle = surface ? SURF.card : (t.gold ? 'rgba(40,28,6,.6)' : 'rgba(0,0,0,.6)');
  for (let y = 44; y < H - 30; y += 24) { g.beginPath(); g.arc(1652, y, 4.4, 0, Math.PI * 2); g.fill(); }

  /* the stub: who it admits, its number, and the city up the edge */
  g.fillStyle = metal(GOLD); g.font = '500 23px "Helvetica Neue", Helvetica, Arial, sans-serif'; g.letterSpacing = '7px';
  g.fillText('ADMIT', 1700, 124); g.fillText('ONE', 1700, 158);
  g.fillStyle = ink(light); g.font = '500 22px ui-monospace, Menlo, monospace'; g.letterSpacing = '3px';
  g.globalAlpha = surface ? 1 : 0.8; g.fillText(t.no[0], 1700, 664); g.fillText(t.no[1], 1700, 698); g.globalAlpha = 1;
  g.save(); g.translate(1936, H / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = metal(GOLD); g.font = '300 196px "Cormorant Garamond", Georgia, serif'; g.letterSpacing = '10px'; g.fillText('DUBLIN', 5, 12); g.restore();
  g.letterSpacing = '0px';
}

export async function addTickets({ THREE, scene, canvasTexture, look, num }) {
  await Promise.all(['300 100px "Cormorant Garamond"', 'italic 300 100px "Cormorant Garamond"', 'italic 400 50px "Cormorant Garamond"'].map((f) => document.fonts.load(f)));
  const tw = 0.205, th = 0.078, tt = 0.0011;
  const place = [
    { x: num('g1x', -0.052), z: num('g1z', -0.074), r: num('g1r', 0.2) },
    { x: num('g2x', 0.014), z: num('g2z', 0.004), r: num('g2r', -0.05) },
    { x: num('g3x', 0.058), z: num('g3z', 0.082), r: num('g3r', -0.27) },
  ];
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i], img = await picture(t.photo);
    const art = canvasTexture(W, H, (g) => paint(g, t, look, img, false), true);
    const surf = canvasTexture(W, H, (g) => paint(g, t, look, img, true), false);
    const face = new THREE.MeshPhysicalMaterial({ map: art, roughnessMap: surf, metalnessMap: surf, roughness: 1, metalness: 1 });
    const edge = new THREE.MeshPhysicalMaterial({ color: t.gold ? 0xb8944a : t.black ? 0x0b0b0d : new THREE.Color(STOCK[look]), roughness: 0.8 });
    const card = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(tw, tt, th), edge), print = new THREE.Mesh(new THREE.PlaneGeometry(tw, th), face);
    print.rotation.x = -Math.PI / 2; print.position.y = tt / 2 + 0.00007; card.add(body, print);
    card.position.set(place[i].x, tt / 2 + i * tt * 1.04 + 0.0001, place[i].z); card.rotation.y = place[i].r; scene.add(card);
  }
}

/* for looking at the artwork flat, without the studio: ticket-art.html uses this */
export async function flat(canvas, id, look, surface) {
  await Promise.all(['300 100px "Cormorant Garamond"', 'italic 300 100px "Cormorant Garamond"', 'italic 400 50px "Cormorant Garamond"'].map((f) => document.fonts.load(f)));
  const t = TIERS.find((x) => x.id === id), img = await picture(t.photo);
  canvas.width = W; canvas.height = H; paint(canvas.getContext('2d'), t, look, img, surface);
}
