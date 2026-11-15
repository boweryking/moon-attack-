/* global THREE */
// Dash Delivery - city grid version: ride to the shop, grab the order, follow the map to the customer.
(function () {
  'use strict';

  // ---- Config -------------------------------------------------------------
  const S = 100;                 // block pitch: roads run along every multiple of S
  const RH = 6;                  // half road width
  const SW = 2.5;                // sidewalk width
  const BLK = RH + SW;           // buildings start this far from a road centre line
  const CRUISE = 20, MAX_SPEED = 40, MIN_SPEED = 4;
  const PLAYER_R = 0.9;
  const FOOD_DECAY = 0.7;
  const SKY = 0x1b2236;
  const RANGE = 4;               // blocks kept alive around the rider

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const mod = (a, n) => ((a % n) + n) % n;
  function hash(i, j, k) { let h = (i * 374761393 + j * 668265263 + k * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

  // ---- Renderer / scene ---------------------------------------------------
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 70, 230);
  const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 600);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x303040, 0.95));
  const sun = new THREE.DirectionalLight(0xffe2b0, 0.7);
  sun.position.set(-6, 14, 8);
  scene.add(sun);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const lam = (color) => new THREE.MeshLambertMaterial({ color: color });
  function addBox(parent, w, h, d, color, x, y, z) {
    const m = new THREE.Mesh(boxGeo, lam(color));
    m.scale.set(w, h, d);
    m.position.set(x || 0, y || 0, z || 0);
    parent.add(m);
    return m;
  }

  // ---- Ground: one repeating tile (roads along its edges) that hops with the rider
  const GN = 9;
  const groundTex = (function () {
    const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), k = N / S;
    g.fillStyle = '#2c2f38'; g.fillRect(0, 0, N, N);
    g.fillStyle = '#6b6f7a'; g.fillRect(RH * k, RH * k, (S - 2 * RH) * k, (S - 2 * RH) * k);
    g.strokeStyle = '#8b90a0'; g.lineWidth = 3; g.strokeRect(RH * k, RH * k, (S - 2 * RH) * k, (S - 2 * RH) * k);
    g.fillStyle = '#e8e8e8';
    const dash = 4 * k, gap = 5 * k;
    for (let t = (RH + 3) * k; t < N - (RH + 3) * k - dash; t += dash + gap) {
      [0, N].forEach(function (e) { g.fillRect(e - 0.22 * k, t, 0.44 * k, dash); g.fillRect(t, e - 0.22 * k, dash, 0.44 * k); });
    }
    // crosswalk stripes at every road mouth
    for (let s = -RH + 1; s < RH - 0.5; s += 2) {
      [RH + 1.2, S - RH - 3.2].forEach(function (p) {
        [0, N].forEach(function (e) { g.fillRect(e + s * k, p * k, 1.1 * k, 2 * k); g.fillRect(p * k, e + s * k, 2 * k, 1.1 * k); });
      });
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(GN, GN);
    t.anisotropy = 4;
    return t;
  })();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GN * S, GN * S), new THREE.MeshLambertMaterial({ map: groundTex }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: 0x1b2230 }));
  far.rotation.x = -Math.PI / 2; far.position.y = -0.3; scene.add(far);

  // ---- City blocks (buildings) created and removed around the rider
  const BLDG_MATS = [0x55699a, 0x6b5a85, 0x3f7f79, 0x946a50, 0x5f6e96, 0x7d6650, 0x585880].map(lam);
  const blocks = new Map();
  function makeBlock(i, j) {
    const g = new THREE.Group();
    const half = (S - 2 * BLK - 1) / 2;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      const h = 9 + hash(i, j, a * 2 + b) * 38;
      const m = new THREE.Mesh(boxGeo, BLDG_MATS[Math.floor(hash(i, j, 7 + a * 2 + b) * BLDG_MATS.length)]);
      m.scale.set(half, h, half);
      m.position.set(i * S + BLK + half / 2 + a * (half + 1), h / 2, j * S + BLK + half / 2 + b * (half + 1));
      g.add(m);
    }
    scene.add(g);
    return g;
  }
  function updateBlocks() {
    const ci = Math.floor(G.x / S), cj = Math.floor(G.z / S);
    for (let di = -RANGE + 1; di <= RANGE; di++) for (let dj = -RANGE + 1; dj <= RANGE; dj++) {
      const key = (ci + di) + ',' + (cj + dj);
      if (!blocks.has(key)) blocks.set(key, makeBlock(ci + di, cj + dj));
    }
    blocks.forEach(function (g, key) {
      const p = key.split(',');
      if (Math.abs(+p[0] - ci) > RANGE + 1 || Math.abs(+p[1] - cj) > RANGE + 1) { scene.remove(g); blocks.delete(key); }
    });
  }
  function solidAt(x, z, r) {   // inside a building block (grown by r)?
    const m = mod(x, S), n = mod(z, S);
    return m > BLK - r && m < S - BLK + r && n > BLK - r && n < S - BLK + r;
  }

  // ---- Rider's bike (faces -z at heading 0)
  const bike = new THREE.Group();
  bike.rotation.order = 'YXZ';
  scene.add(bike);
  addBox(bike, 0.5, 0.5, 1.8, 0xff5a1f, 0, 0.6, 0);
  addBox(bike, 0.55, 0.9, 0.6, 0x2a6cff, 0, 1.25, 0.15);
  addBox(bike, 0.5, 0.5, 0.5, 0xffffff, 0, 1.9, 0.1);
  addBox(bike, 0.9, 0.8, 0.8, 0xffc233, 0, 1.2, 0.95);
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.22, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const z of [-0.8, 0.8]) {
    const w = new THREE.Mesh(wheelGeo, lam(0x111111));
    w.position.set(0, 0.45, z);
    bike.add(w);
    wheels.push(w);
  }

  // ---- Target marker (blue = pick-up, green = drop-off), beam is visible from far away
  const marker = new THREE.Group();
  marker.visible = false;
  scene.add(marker);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.25, 8, 32), new THREE.MeshBasicMaterial({ color: 0x4cff7a }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; marker.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 160, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x4cff7a, transparent: true, opacity: 0.3, depthWrite: false, fog: false }));
  beam.position.y = 80; marker.add(beam);
  const propGroup = new THREE.Group();   // storefront / house for the current target
  scene.add(propGroup);

  function makeSign(icon, text, color) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 192;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(10,14,28,.9)'; g.strokeStyle = color; g.lineWidth = 10;
    g.beginPath(); g.moveTo(24, 6); g.arcTo(506, 6, 506, 186, 28); g.arcTo(506, 186, 6, 186, 28); g.arcTo(6, 186, 6, 6, 28); g.arcTo(6, 6, 506, 6, 28); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.font = '700 84px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(icon, 28, 100);
    g.font = '700 40px system-ui, sans-serif'; g.fillStyle = color;
    const words = text.split(' '), lines = []; let line = '';
    words.forEach(function (w) { if ((line + ' ' + w).length > 14 && line) { lines.push(line); line = w; } else line = (line ? line + ' ' : '') + w; });
    lines.push(line);
    lines.slice(0, 2).forEach(function (l, n) { g.fillText(l, 140, lines.length > 1 ? 70 + n * 52 : 96); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), fog: false }));
    sp.scale.set(15, 5.6, 1);
    return sp;
  }
  function clearProps() { while (propGroup.children.length) propGroup.remove(propGroup.children[0]); }
  function buildProps(t, kind, icon, label, color, tierColor) {
    clearProps();
    // the building front sits on the sidewalk beside the ring
    const side = t.side, g = new THREE.Group();
    const w = 10, d = 5, h = kind === 'shop' ? 5 : 4;
    const off = RH + d / 2 - 0.2;
    const body = addBox(g, t.vert ? d : w, h, t.vert ? w : d, kind === 'shop' ? 0xffe0a0 : 0xa0d8b0, 0, h / 2, 0);
    const awn = addBox(g, t.vert ? d + 1.4 : w, 0.7, t.vert ? w : d + 1.4, parseInt(tierColor.slice(1), 16), 0, h + 0.35, 0);
    g.position.set(t.x + (t.vert ? side * off : 0), 0, t.z + (t.vert ? 0 : side * off));
    propGroup.add(g);
    const sp = makeSign(icon, label, color);
    sp.position.set(t.x + (t.vert ? side * (RH - 1.5) : 0), h + 5.5, t.z + (t.vert ? 0 : side * (RH - 1.5)));
    propGroup.add(sp);
  }
  function setMarker(t, color) {
    marker.position.set(t.x, 0, t.z);
    ring.material.color.setHex(color); beam.material.color.setHex(color);
    marker.visible = true;
  }

  const CAR_COLORS = [0xd9534f, 0x5bc0de, 0xf0ad4e, 0xdddddd, 0x5cb85c, 0x9b59b6];
  const SHIRT_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f];

  function makeCar() {
    const g = new THREE.Group();
    addBox(g, 2, 0.9, 4, pick(CAR_COLORS), 0, 0.6, 0);
    addBox(g, 1.7, 0.7, 2, 0x222831, 0, 1.3, -0.2);
    addBox(g, 0.35, 0.2, 0.1, 0xffff99, -0.6, 0.7, -2.02);
    addBox(g, 0.35, 0.2, 0.1, 0xffff99, 0.6, 0.7, -2.02);
    addBox(g, 0.35, 0.2, 0.1, 0xff3333, -0.6, 0.7, 2.02);
    addBox(g, 0.35, 0.2, 0.1, 0xff3333, 0.6, 0.7, 2.02);
    return g;
  }

  function makeCone() {
    const g = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 10), lam(0xff7a1a));
    cone.position.y = 0.5;
    g.add(cone);
    addBox(g, 0.9, 0.1, 0.9, 0x222222, 0, 0.05, 0);
    return g;
  }

  function makePed() {
    const g = new THREE.Group();
    addBox(g, 0.5, 0.9, 0.3, pick(SHIRT_COLORS), 0, 0.9, 0);
    addBox(g, 0.2, 0.7, 0.2, 0x333344, -0.12, 0.35, 0);
    addBox(g, 0.2, 0.7, 0.2, 0x333344, 0.12, 0.35, 0);
    addBox(g, 0.36, 0.36, 0.36, 0xf1c9a5, 0, 1.5, 0);
    return g;
  }


  // ---- Game state ---------------------------------------------------------
  const objs = [];   // { kind, group, vx, vz, hw, hl, hit }
  const G = {};

  function resetRun() {
    for (const o of objs) scene.remove(o.group);
    objs.length = 0;
    clearProps();
    Object.assign(G, {
      state: 'start', x: 3, z: 60, h: 0, camH: 0, speed: CRUISE, steer: 0,
      health: 100, score: 0, combo: 1, delivered: 0, earned: 0,
      job: null, phase: 'pickup', order: null, food: 100, timeLeft: 0, lowWarned: false,
      msgT: 0, shake: 0, honkT: 0, scrapeT: 0, t: 0
    });
    marker.visible = false;
  }

  function addObj(kind, group, x, z, vx, vz, hw, hl) {
    group.position.set(x, 0, z);
    scene.add(group);
    objs.push({ kind: kind, group: group, vx: vx, vz: vz, hw: hw, hl: hl, hit: false });
  }

  // a random point on a road, roughly dmin..dmax from the rider
  function roadPoint(dmin, dmax) {
    const ang = rand(0, Math.PI * 2), d = rand(dmin, dmax);
    let px = G.x + Math.cos(ang) * d, pz = G.z + Math.sin(ang) * d;
    const vert = Math.random() < 0.5;
    if (vert) px = Math.round(px / S) * S; else pz = Math.round(pz / S) * S;
    // keep out of the intersection itself
    if (vert) { const m = mod(pz, S); if (m < RH + 4 || m > S - RH - 4) pz += S * 0.5; }
    else { const m = mod(px, S); if (m < RH + 4 || m > S - RH - 4) px += S * 0.5; }
    return { x: px, z: pz, vert: vert };
  }
  function countOf(kind) { let n = 0; for (const o of objs) if (o.kind === kind) n++; return n; }

  function spawnCar() {
    const p = roadPoint(90, 260), dir = Math.random() < 0.5 ? 1 : -1, sp = rand(7, 13) * dir, g = makeCar();
    if (p.vert) {   // drives along z
      g.rotation.y = dir > 0 ? Math.PI : 0;
      addObj('car', g, p.x - dir * 3, p.z, 0, sp, 1, 2);
    } else {        // drives along x
      g.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      addObj('car', g, p.x, p.z + dir * 3, sp, 0, 2, 1);
    }
  }
  function spawnCone() {
    const p = roadPoint(60, 240), off = pick([-4, -1.5, 1.5, 4]);
    addObj('cone', makeCone(), p.vert ? p.x + off : p.x, p.vert ? p.z : p.z + off, 0, 0, 0.5, 0.5);
  }
  function spawnPed() {
    const p = roadPoint(70, 220), dir = Math.random() < 0.5 ? 1 : -1, vx = dir * 2.2;
    if (p.vert) addObj('ped', makePed(), p.x - dir * 9, p.z, vx, 0, 0.4, 0.4);
    else addObj('ped', makePed(), p.x, p.z - dir * 9, 0, vx, 0.4, 0.4);
    objs[objs.length - 1].endX = dir * 9.5; objs[objs.length - 1].vert = p.vert; objs[objs.length - 1].c = p.vert ? p.x : p.z; objs[objs.length - 1].dir = dir;
  }

  function flash(text, color) {
    const el = document.getElementById('msg');
    el.textContent = text;
    el.style.color = color || '#fff';
    el.style.opacity = 1;
    G.msgT = 1.8;
  }
  function showPanel(html, buttonText) {
    const panel = document.getElementById('panel');
    panel.innerHTML = html + '<br><button id="go">' + buttonText + '</button>';
    document.getElementById('overlay').style.display = 'flex';
  }
  function hidePanel() { document.getElementById('overlay').style.display = 'none'; }

  // ---- Jobs ---------------------------------------------------------------
  const TIERS = {
    easy:   { label: 'EASY',   color: '#4cff7a', traffic: 0.6, timeF: 2.0, decay: 0.3, base: 80,  pk: [150, 250], dr: [200, 300], unlock: 0 },
    medium: { label: 'MEDIUM', color: '#ffc233', traffic: 1.0, timeF: 1.5, decay: 0.7, base: 190, pk: [200, 300], dr: [280, 400], unlock: 400 },
    hard:   { label: 'HARD',   color: '#ff5a5a', traffic: 1.6, timeF: 1.2, decay: 1.2, base: 420, pk: [250, 400], dr: [380, 560], unlock: 1200 }
  };
  const MENU = {
    easy:   [['☕', 'Coffee run', 'Corner Café'], ['🥯', 'Bagel box', 'Bagel Barn'], ['🥗', 'Salad bowl', 'Green Leaf']],
    medium: [['🍕', 'Hot pizza', "Tony's Pizza"], ['🍔', 'Burger combo', 'Burger Hut'], ['🍜', 'Noodle soup', 'Wok Express']],
    hard:   [['🍣', 'Sushi platter', 'Sushi Zen'], ['🍦', 'Ice cream (melts fast!)', "Frosty's"], ['🎂', 'Wedding cake', 'Sweet Tiers Bakery']]
  };
  const CUSTOMERS = ['Mrs. Lee', 'Big Mike', 'Apt 4B', 'The Garcias', 'Dr. Patel', 'Night shift crew'];

  // a spot on a street about `dist` metres of city blocks from (fx, fz)
  function pickSpot(fx, fz, dist) {
    const blocks = Math.max(2, Math.round(dist / S));
    for (let n = 0; n < 30; n++) {
      const a = Math.round(rand(-blocks, blocks)), b = (blocks - Math.abs(a)) * (Math.random() < 0.5 ? 1 : -1);
      const k = Math.round(fx / S) + a, j = Math.round(fz / S) + b, vert = Math.random() < 0.5;
      const t = vert ? { x: k * S, z: (j + 0.5) * S, vert: true } : { x: (k + 0.5) * S, z: j * S, vert: false };
      t.side = Math.random() < 0.5 ? 1 : -1;
      if (Math.hypot(t.x - fx, t.z - fz) > 120) return t;
    }
    return { x: Math.round(fx / S) * S + S * 2, z: (Math.round(fz / S) + 0.5) * S, vert: true, side: 1 };
  }

  function makeJob(tierKey) {
    const T = TIERS[tierKey], m = pick(MENU[tierKey]);
    const a = pickSpot(G.x, G.z, rand(T.pk[0], T.pk[1]));
    const b = pickSpot(a.x, a.z, rand(T.dr[0], T.dr[1]));
    const pk = Math.round(Math.abs(a.x - G.x) + Math.abs(a.z - G.z)), dr = Math.round(Math.abs(b.x - a.x) + Math.abs(b.z - a.z));
    return {
      tier: tierKey, icon: m[0], item: m[1], shop: m[2], customer: pick(CUSTOMERS), a: a, b: b, pk: pk, dr: dr,
      time: Math.round((pk + dr) / 17 * T.timeF + 12), pay: Math.round(T.base * rand(0.95, 1.2))
    };
  }

  function showBoard(note) {
    G.state = 'board';
    G.job = null; G.order = null; marker.visible = false; clearProps();
    stopEngine();
    const order = ['easy', 'medium', 'hard'];
    let top = 'easy'; order.forEach(function (k) { if (G.earned >= TIERS[k].unlock) top = k; });
    const tiers = order.concat([top]).sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
    const jobs = []; tiers.forEach(function (k) { let j; for (let n = 0; n < 6; n++) { j = makeJob(k); if (!jobs.some(function (o) { return o.item === j.item; })) break; } jobs.push(j); });
    let html = '<h1>Job board</h1><p class="hint">' + (note ? note + '<br>' : '') +
      'Earned this shift: <b>$' + G.earned + '</b> &middot; Delivered: <b>' + G.delivered + '</b></p><div class="jobs">';
    jobs.forEach(function (j, i) {
      const T = TIERS[j.tier], locked = G.earned < T.unlock;
      html += '<button class="job' + (locked ? ' locked' : '') + '" data-i="' + i + '"' + (locked ? ' disabled' : '') + ' style="border-color:' + T.color + '">' +
        '<span class="ji">' + j.icon + '</span><span class="jt"><b>' + j.item + '</b><br><small>' + j.shop + ' &rarr; ' + j.customer + '</small></span>' +
        '<span class="jp"><b style="color:' + T.color + '">' + T.label + '</b><br>' +
        (locked ? 'Earn $' + T.unlock : '$' + j.pay + '+<br><small>' + (j.pk + j.dr) + 'm &middot; ' + j.time + 's</small>') + '</span></button>';
    });
    html += '</div>';
    const panel = document.getElementById('panel');
    panel.innerHTML = html;
    document.getElementById('overlay').style.display = 'flex';
    panel.querySelectorAll('.job:not(.locked)').forEach(function (b) {
      b.addEventListener('click', function () { startJob(jobs[+b.getAttribute('data-i')]); });
    });
    say('v_board');
  }

  function startJob(job) {
    audioInit();
    G.job = job; G.phase = 'pickup'; G.state = 'play';
    G.timeLeft = job.time; G.food = 100; G.lowWarned = false;
    hidePanel();
    G.order = job.a;
    setMarker(job.a, 0x4cc2ff);
    buildProps(job.a, 'shop', job.icon, job.shop, '#4cc2ff', TIERS[job.tier].color);
    say(job.tier === 'easy' ? 'v_easy' : job.tier === 'medium' ? 'v_mid' : 'v_hard');
    flash('Pick up at ' + job.shop + ' - follow the map', '#4cc2ff');
    startEngine();
    const hb = document.getElementById('hintbar'); if (G.delivered < 1) hb.style.opacity = 1;
  }

  function startRun() {
    audioInit();
    resetRun();
    G.state = 'board';
    startMusic();
    showBoard();
  }

  function gameOver() {
    G.state = 'over';
    stopEngine();
    say('v_over');
    document.getElementById('panel').innerHTML = '<h1>Shift over</h1><p>Orders delivered: <b>' + G.delivered + '</b></p><p>Money earned: <b>$' + G.earned + '</b></p><p>Score: <b>' + G.score + '</b></p><br><button id="go">New shift</button>';
    document.getElementById('overlay').style.display = 'flex';
  }

  function pickedUp() {
    G.phase = 'deliver';
    play('pickup', 0.8);
    say('v_pickedup');
    G.order = G.job.b;
    setMarker(G.job.b, 0x4cff7a);
    buildProps(G.job.b, 'home', '🏠', G.job.customer, '#4cff7a', '#4cff7a');
    flash('Got it! Deliver to ' + G.job.customer, '#4cff7a');
  }

  function deliver() {
    const pay = G.job.pay + Math.round(G.food);
    const bonus = Math.round(G.timeLeft) * 3;
    const gained = (pay + bonus) * G.combo;
    G.earned += pay + bonus;
    G.score += gained;
    G.combo = Math.min(G.combo + 1, 5);
    G.delivered++;
    G.health = Math.min(100, G.health + 10);
    play('cash', 0.8);
    say(Math.random() < 0.5 ? 'v_thanks1' : 'v_thanks2');
    flash('Delivered! +$' + (pay + bonus), '#4cff7a');
    marker.visible = false;
    G.state = 'wait';
    setTimeout(function () { if (G.state === 'wait') showBoard('Nice one! Tip: $' + bonus); }, 1700);
  }

  function failJob(text, voice) {
    G.combo = 1;
    play('fail', 0.7);
    say(voice);
    flash(text, '#ff5a5a');
    marker.visible = false;
    G.state = 'wait';
    setTimeout(function () { if (G.state === 'wait') showBoard(text); }, 1900);
  }

  function hurt(dmg) { G.health -= dmg; if (G.health <= 0) { G.health = 0; gameOver(); } }

  function crash(o) {
    o.hit = true;
    G.combo = 1;
    G.shake = 0.5;
    if (o.kind === 'car') {
      G.food -= 25; G.speed = Math.min(G.speed, 6);
      play('crash', 0.9); if (Math.random() < 0.6) say('v_crash');
      flash('CRASH!', '#ff5a5a'); hurt(30);
    } else if (o.kind === 'cone') {
      G.food -= 10; G.speed *= 0.4; o.group.rotation.z = 1.3;
      play('cone', 0.9);
      flash('Cone!', '#ffb020'); hurt(8);
    } else {
      G.food -= 20; G.speed = MIN_SPEED; o.group.rotation.x = Math.PI / 2;
      play('crash', 0.6); say('v_ped', true);
      flash('Pedestrian hit!', '#ff5a5a'); hurt(35);
    }
  }

  // ---- Per-frame logic ----------------------------------------------------
  function update(dt) {
    const T = TIERS[G.job.tier];
    // Controls: finger drag (left/right steers, up/down = faster/slower), or keys
    let steerIn = 0, speedTarget = CRUISE, holdSpeed = false;
    if (ptr) {
      steerIn = clamp((ptr.x - ptr.sx) / (window.innerWidth * 0.3), -1, 1);
      speedTarget = clamp(CRUISE + (ptr.sy - ptr.y) / window.innerHeight * 60, MIN_SPEED, MAX_SPEED);
    } else {
      steerIn = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
      if (keys.ArrowUp || keys.KeyW) { speedTarget = MAX_SPEED; holdSpeed = true; }
      else if (keys.ArrowDown || keys.KeyS) { speedTarget = MIN_SPEED; holdSpeed = true; }
    }
    const rate = speedTarget > G.speed ? 14 : 24;
    G.speed += clamp(speedTarget - G.speed, -rate * dt, rate * dt);
    G.steer += (steerIn - G.steer) * Math.min(1, 9 * dt);
    G.h -= G.steer * 3.0 / (1 + G.speed / 24) * dt;   // right = clockwise
    const fx = -Math.sin(G.h), fz = -Math.cos(G.h);
    G.x += fx * G.speed * dt;
    G.z += fz * G.speed * dt;
    setEngine(G.speed);

    // buildings: slide out and scrape
    if (solidAt(G.x, G.z, PLAYER_R)) {
      const m = mod(G.x, S), n = mod(G.z, S), kx = Math.floor(G.x / S) * S, kz = Math.floor(G.z / S) * S;
      const pens = [[m - (BLK - PLAYER_R), -1, 0], [(S - BLK + PLAYER_R) - m, 1, 0], [n - (BLK - PLAYER_R), 0, -1], [(S - BLK + PLAYER_R) - n, 0, 1]];
      pens.sort(function (a, b) { return a[0] - b[0]; });
      const p = pens[0];
      G.x += p[1] * (p[0] + 0.05); G.z += p[2] * (p[0] + 0.05);
      if (G.speed > 8) { G.speed *= 0.5; }
      if (G.scrapeT <= 0) { G.scrapeT = 0.7; G.shake = 0.35; G.combo = 1; play('cone', 0.8, 0.7); flash('Watch the buildings!', '#ffb020'); hurt(6); if (G.state !== 'play') return; }
    }
    G.scrapeT -= dt;

    // Timers and food (food only cools once you have it)
    G.timeLeft -= dt;
    if (G.phase === 'deliver') G.food -= T.decay * FOOD_DECAY / 0.7 * dt;
    if (G.timeLeft < 8 && !G.lowWarned) { G.lowWarned = true; say('v_clock'); }
    if (G.timeLeft <= 0) return failJob('Too late!', 'v_late');
    if (G.food <= 0) return failJob('Food went cold!', 'v_cold');

    // Pick-up / drop-off: ride into the ring
    if (Math.hypot(G.x - G.order.x, G.z - G.order.z) < 5) {
      if (G.phase === 'pickup') pickedUp(); else return deliver();
    }

    // Traffic fills in around the rider
    const diff = T.traffic * Math.min(1.5, 1 + G.delivered * 0.04);
    if (countOf('car') < 8 * diff) spawnCar();
    if (countOf('cone') < 9 * diff) spawnCone();
    if (countOf('ped') < 3 * diff + 1) spawnPed();
    G.honkT -= dt;

    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      o.group.position.x += o.vx * dt;
      o.group.position.z += o.vz * dt;
      const p = o.group.position;
      const gone = Math.hypot(p.x - G.x, p.z - G.z) > 330;
      let crossed = false;
      if (o.kind === 'ped') { const rel = (o.vert ? p.x : p.z) - o.c; crossed = o.dir > 0 ? rel > 9.5 : rel < -9.5; }
      if (gone || crossed) { scene.remove(o.group); objs.splice(i, 1); }
    }

    for (const o of objs) {
      if (o.hit) continue;
      const p = o.group.position;
      const ex = Math.max(Math.abs(p.x - G.x) - o.hw, 0), ez = Math.max(Math.abs(p.z - G.z) - o.hl, 0);
      const d2 = ex * ex + ez * ez;
      if (d2 < PLAYER_R * PLAYER_R) {
        crash(o);
        if (G.state !== 'play') return;
      } else if (o.kind === 'car' && !o.honked && d2 < 3.5 * 3.5 && G.honkT <= 0) {
        o.honked = true; G.honkT = 4; play('horn', 0.35);   // near miss: the other driver honks
      }
    }
  }

  // ---- Visuals ------------------------------------------------------------
  function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
  function syncScene(dt, now) {
    bike.position.set(G.x, 0, G.z);
    bike.rotation.set(0, G.h, -G.steer * 0.35 * Math.min(1, G.speed / 20));
    for (const w of wheels) w.rotation.x -= G.speed * dt / 0.45;

    ground.position.set((Math.round(G.x / S - 0.5) + 0.5) * S, 0, (Math.round(G.z / S - 0.5) + 0.5) * S);
    updateBlocks();

    if (marker.visible) {
      const pulse = 1 + 0.08 * Math.sin(now * 0.006);
      ring.scale.set(pulse, pulse, pulse);
    }

    // chase camera: trails the bike's heading a little for a smooth feel
    G.camH += angDiff(G.h, G.camH) * (1 - Math.exp(-6 * dt));
    G.shake = Math.max(0, G.shake - dt * 1.5);
    const cfx = -Math.sin(G.camH), cfz = -Math.cos(G.camH);
    const sx = (Math.random() - 0.5) * G.shake * 0.6, sy = (Math.random() - 0.5) * G.shake * 0.4;
    camera.position.set(G.x - cfx * 7.5, 3.6, G.z - cfz * 7.5);
    camera.lookAt(G.x + cfx * 10 + sx, 1.3 + sy, G.z + cfz * 10);
  }

  // ---- Map: heading-up mini map with a route to the current target
  const mini = document.getElementById('mini'), mctx = mini.getContext('2d');
  const MS = 0.55;   // px per metre
  function routePts() {
    const t = G.order, ci = Math.floor(G.x / S), cj = Math.floor(G.z / S), fx = -Math.sin(G.h), fz = -Math.cos(G.h);
    let cand;
    if (t.vert) { const k = Math.round(t.x / S), j = Math.floor(t.z / S); cand = [[k, j], [k, j + 1]]; }
    else { const j = Math.round(t.z / S), k = Math.floor(t.x / S); cand = [[k, j], [k + 1, j]]; }
    // start from the corner ahead of the rider that gets us to the target soonest
    let best = null, bs = 1e9;
    [[ci, cj], [ci + 1, cj], [ci, cj + 1], [ci + 1, cj + 1]].forEach(function (c) {
      cand.forEach(function (e) {
        const dx = c[0] * S - G.x, dz = c[1] * S - G.z;
        const sc = Math.hypot(dx, dz) + (Math.abs(e[0] - c[0]) + Math.abs(e[1] - c[1])) * S + (dx * fx + dz * fz < 0 ? 90 : 0);
        if (sc < bs) { bs = sc; best = [c, e]; }
      });
    });
    const c = best[0], e = best[1], pts = [[G.x, G.z], [c[0] * S, c[1] * S]];
    if (t.vert) pts.push([e[0] * S, c[1] * S]); else pts.push([c[0] * S, e[1] * S]);
    pts.push([e[0] * S, e[1] * S]);
    pts.push([t.x, t.z]);
    return pts;
  }
  function drawMap() {
    const W = mini.width, R = W / 2, dpr = W / mini.clientWidth || 1, sc = MS * dpr;
    mctx.clearRect(0, 0, W, W);
    mctx.save();
    mctx.beginPath(); mctx.arc(R, R, R - 2, 0, Math.PI * 2); mctx.clip();
    mctx.fillStyle = 'rgba(14,18,32,.82)'; mctx.fillRect(0, 0, W, W);
    const rx = Math.cos(G.h), rz = -Math.sin(G.h), fx = -Math.sin(G.h), fz = -Math.cos(G.h);
    const toS = function (x, z) { const dx = x - G.x, dz = z - G.z; return [R + (dx * rx + dz * rz) * sc, R - (dx * fx + dz * fz) * sc]; };
    const span = R / sc + S;
    mctx.lineCap = 'round';
    mctx.strokeStyle = '#4b5166'; mctx.lineWidth = 7 * dpr * 0.55 + 2;
    for (let k = Math.floor((G.x - span) / S); k <= Math.ceil((G.x + span) / S); k++) {
      const a = toS(k * S, G.z - span), b = toS(k * S, G.z + span); mctx.beginPath(); mctx.moveTo(a[0], a[1]); mctx.lineTo(b[0], b[1]); mctx.stroke();
    }
    for (let k = Math.floor((G.z - span) / S); k <= Math.ceil((G.z + span) / S); k++) {
      const a = toS(G.x - span, k * S), b = toS(G.x + span, k * S); mctx.beginPath(); mctx.moveTo(a[0], a[1]); mctx.lineTo(b[0], b[1]); mctx.stroke();
    }
    if (G.order && (G.state === 'play')) {
      const pts = routePts().map(function (p) { return toS(p[0], p[1]); });
      mctx.strokeStyle = G.phase === 'pickup' ? '#4cc2ff' : '#4cff7a'; mctx.lineWidth = 4 * dpr * 0.6 + 1;
      mctx.beginPath(); pts.forEach(function (p, n) { if (n) mctx.lineTo(p[0], p[1]); else mctx.moveTo(p[0], p[1]); }); mctx.stroke();
      // destination pin, clamped to the edge when it is off the map
      let [px, py] = toS(G.order.x, G.order.z); const dx = px - R, dy = py - R, dd = Math.hypot(dx, dy), lim = R - 14 * dpr;
      if (dd > lim) { px = R + dx / dd * lim; py = R + dy / dd * lim; }
      mctx.fillStyle = G.phase === 'pickup' ? '#4cc2ff' : '#4cff7a'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2;
      mctx.beginPath(); mctx.arc(px, py, 8 * dpr * 0.8, 0, Math.PI * 2); mctx.fill(); mctx.stroke();
      mctx.fillStyle = '#04101f'; mctx.font = '700 ' + (11 * dpr) + 'px system-ui'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
      mctx.fillText(G.phase === 'pickup' ? 'P' : 'D', px, py + 1);
    }
    mctx.restore();
    // me
    mctx.fillStyle = '#ffc233'; mctx.strokeStyle = '#000'; mctx.lineWidth = 2;
    mctx.beginPath(); mctx.moveTo(R, R - 9 * dpr); mctx.lineTo(R + 6 * dpr, R + 7 * dpr); mctx.lineTo(R, R + 3 * dpr); mctx.lineTo(R - 6 * dpr, R + 7 * dpr); mctx.closePath(); mctx.fill(); mctx.stroke();
    mctx.strokeStyle = 'rgba(255,255,255,.55)'; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(R, R, R - 2, 0, Math.PI * 2); mctx.stroke();
  }

  function updateHUD() {
    const setText = (id, t) => { document.getElementById(id).textContent = t; };
    setText('score', G.score);
    setText('combo', 'x' + G.combo);
    const timeEl = document.getElementById('time');
    timeEl.textContent = Math.max(0, Math.ceil(G.timeLeft));
    timeEl.style.color = G.timeLeft < 5 ? '#ff5a5a' : '#fff';
    setText('distlabel', G.phase === 'pickup' ? 'To pickup' : 'To drop-off');
    setText('dist', G.order && G.state === 'play' ? Math.round(Math.hypot(G.x - G.order.x, G.z - G.order.z)) + 'm' : '-');
    document.querySelector('#healthBar > div').style.width = clamp(G.health, 0, 100) + '%';
    document.querySelector('#foodBar > div').style.width = clamp(G.food, 0, 100) + '%';
    mini.style.opacity = G.state === 'play' ? 1 : 0;
    if (G.state === 'play') drawMap();
    if (G.msgT > 0) {
      G.msgT -= 1 / 60;
      if (G.msgT <= 0) document.getElementById('msg').style.opacity = 0;
    }
  }

  // ---- Input: finger drag ---------------------------------------------------
  const keys = {};
  let ptr = null;
  const inOverlay = (t) => t && t.closest && t.closest('#overlay');

  window.addEventListener('pointerdown', function (e) {
    audioInit();
    if (G.state !== 'play' || inOverlay(e.target) || ptr) return;
    e.preventDefault();
    ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY };
    document.getElementById('hintbar').style.opacity = 0;
  }, { passive: false });
  window.addEventListener('pointermove', function (e) {
    if (ptr && e.pointerId === ptr.id) { ptr.x = e.clientX; ptr.y = e.clientY; e.preventDefault(); }
  }, { passive: false });
  const endPtr = function (e) { if (ptr && e.pointerId === ptr.id) ptr = null; };
  window.addEventListener('pointerup', endPtr);
  window.addEventListener('pointercancel', endPtr);
  document.addEventListener('touchmove', function (e) { if (G.state === 'play') e.preventDefault(); }, { passive: false });

  const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  window.addEventListener('keydown', function (e) {
    if (GAME_KEYS.indexOf(e.code) !== -1) e.preventDefault();
    if (e.repeat) return;
    audioInit();
    keys[e.code] = true;
    if (e.code === 'KeyH') play('horn', 0.6);
    if ((e.code === 'Space' || e.code === 'Enter') && (G.state === 'start' || G.state === 'over')) startRun();
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('blur', function () { for (const k in keys) keys[k] = false; ptr = null; });

  document.getElementById('overlay').addEventListener('click', function (e) {
    if (e.target && e.target.id === 'go') startRun();
  });

  // ---- Audio ----------------------------------------------------------------
  let AC = null, master = null, musicG = null, engSrc = null, engG = null, voiceSrc = null, voiceT = 0;
  const buf = {};
  const NAMES = ['engine', 'horn', 'crash', 'cone', 'pickup', 'cash', 'fail', 'music', 'v_board', 'v_easy', 'v_mid', 'v_hard', 'v_pickedup', 'v_thanks1', 'v_thanks2', 'v_late', 'v_cold', 'v_missed', 'v_crash', 'v_ped', 'v_clock', 'v_over'];
  function audioInit() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    const Ctor = window.AudioContext || window.webkitAudioContext; if (!Ctor) return;
    AC = new Ctor(); master = AC.createGain(); master.gain.value = 0.9; master.connect(AC.destination);
    musicG = AC.createGain(); musicG.gain.value = 0.0; musicG.connect(master);
    NAMES.forEach(function (n) {
      fetch('audio/' + n + '.mp3').then(function (r) { return r.arrayBuffer(); })
        .then(function (a) { return new Promise(function (res, rej) { AC.decodeAudioData(a, res, rej); }); })
        .then(function (b) { buf[n] = b; if (n === 'music' && G.state !== 'start') startMusic(); if (n === 'engine' && G.state === 'play') startEngine(); })
        .catch(function () {});
    });
  }
  function play(n, vol, rate) {
    if (!AC || !buf[n]) return null;
    const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = buf[n]; g.gain.value = vol == null ? 1 : vol; if (rate) s.playbackRate.value = rate;
    s.connect(g); g.connect(master); s.start(); return s;
  }
  function say(n, force) {   // one voice at a time; a new line waits its turn unless forced
    if (!AC || !buf[n]) return;
    if (!force && AC.currentTime < voiceT) return;
    if (voiceSrc) { try { voiceSrc.stop(); } catch (e) {} }
    voiceSrc = play(n, 1.0); voiceT = AC.currentTime + buf[n].duration + 0.3;
  }
  let musicSrc = null;
  function startMusic() {
    if (!AC || !buf.music || musicSrc) return;
    musicSrc = AC.createBufferSource(); musicSrc.buffer = buf.music; musicSrc.loop = true; musicSrc.connect(musicG); musicSrc.start();
    musicG.gain.setTargetAtTime(0.32, AC.currentTime, 0.8);
  }
  function startEngine() {
    if (!AC || !buf.engine || engSrc) return;
    engSrc = AC.createBufferSource(); engG = AC.createGain(); engG.gain.value = 0.0; engSrc.buffer = buf.engine; engSrc.loop = true;
    engSrc.connect(engG); engG.connect(master); engSrc.start(); engG.gain.setTargetAtTime(0.5, AC.currentTime, 0.2);
  }
  function setEngine(speed) { if (engSrc) engSrc.playbackRate.setTargetAtTime(0.7 + speed / MAX_SPEED * 1.1, AC.currentTime, 0.1); }
  function stopEngine() { if (engSrc) { try { engSrc.stop(); } catch (e) {} engSrc = null; } }
  // duck the music while someone is talking
  setInterval(function () { if (musicG && AC) musicG.gain.setTargetAtTime(AC.currentTime < voiceT ? 0.12 : 0.32, AC.currentTime, 0.2); }, 150);


  // ---- Loop ---------------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (G.state === 'play') {
      G.t += dt;
      update(dt);
    }
    syncScene(dt, now);
    renderer.render(scene, camera);
    updateHUD();
    requestAnimationFrame(frame);
  }

  resetRun();
  window.DD = { G: G, marker: marker, objs: objs, routePts: routePts };
  document.getElementById('panel').innerHTML = '<h1>Dash Delivery</h1>' +
    '<p>Pick a job. Ride to the shop (<b style="color:#4cc2ff">blue</b> ring) to grab the order, then follow the <b>map</b> to the customer (<b style="color:#4cff7a">green</b> ring).</p>' +
    '<p><b>Drag your finger</b>: left / right to turn, up to go faster, down to slow down. Slow down for corners and stay off the buildings.</p>' +
    '<p class="hint">Harder jobs pay more but have more traffic and less time. Keep the food hot.</p><br><button id="go">Start shift</button>';
  requestAnimationFrame(frame);
})();
