/* global THREE */
// Dash Delivery - step 1 prototype.
// Third-person motorbike courier: ride to the green drop-off marker and press SPACE.
(function () {
  'use strict';

  // ---- Config -------------------------------------------------------------
  const LANES = [-3.5, 0, 3.5];
  const CRUISE = 24;
  const MAX_SPEED = 46;
  const MIN_SPEED = 6;
  const STEER = 8;
  const PLAYER_HW = 0.5;
  const PLAYER_HL = 1.1;
  const FOOD_DECAY = 0.7;          // food temperature lost per second
  const DASH_STEP = 6;
  const DASH_COUNT = 60;
  const DASH_LOOP = DASH_STEP * DASH_COUNT;
  const BLDG_STEP = 24;
  const BLDG_COUNT = 30;
  const BLDG_LOOP = BLDG_STEP * BLDG_COUNT;
  const SKY = 0x1b2236;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  // ---- Renderer / scene ---------------------------------------------------
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 60, 200);
  const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 500);
  camera.position.set(0, 3.4, 7.5);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x303040, 0.9));
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

  // Ground that follows the rider
  const grass = addBox(scene, 200, 0.1, 1000, 0x1f3b2a, 0, -0.1, 0);
  const road = addBox(scene, 12, 0.05, 1000, 0x2c2f38, 0, 0, 0);
  const sidewalkL = addBox(scene, 3, 0.3, 1000, 0x6b6f7a, -7.5, 0.15, 0);
  const sidewalkR = addBox(scene, 3, 0.3, 1000, 0x6b6f7a, 7.5, 0.15, 0);

  // Lane dashes that recycle as the rider moves
  const dashMat = lam(0xe9e9e9);
  const dashes = [];
  for (const x of [-1.75, 1.75]) {
    for (let i = 0; i < DASH_COUNT; i++) {
      const d = new THREE.Mesh(boxGeo, dashMat);
      d.scale.set(0.18, 0.03, 3);
      d.position.set(x, 0.02, -i * DASH_STEP);
      scene.add(d);
      dashes.push(d);
    }
  }

  // Buildings on both sides that recycle
  const BLDG_COLORS = [0x3a4a6b, 0x4b3f5c, 0x2f5a57, 0x6b4d3a, 0x44506a];
  const buildings = [];
  function resetBuilding(b) {
    const w = rand(6, 10), h = rand(8, 40), d = rand(14, 20);
    b.scale.set(w, h, d);
    b.position.x = b.userData.side * rand(14, 17);
    b.position.y = h / 2;
    b.material.color.setHex(pick(BLDG_COLORS));
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < BLDG_COUNT; i++) {
      const b = new THREE.Mesh(boxGeo, lam(0x444444));
      b.userData.side = side;
      b.position.z = -i * BLDG_STEP;
      scene.add(b);
      resetBuilding(b);
      buildings.push(b);
    }
  }

  // Rider's bike (faces -z)
  const bike = new THREE.Group();
  scene.add(bike);
  addBox(bike, 0.5, 0.5, 1.8, 0xff5a1f, 0, 0.6, 0);        // frame
  addBox(bike, 0.55, 0.9, 0.6, 0x2a6cff, 0, 1.25, 0.15);    // rider torso
  addBox(bike, 0.5, 0.5, 0.5, 0xffffff, 0, 1.9, 0.1);       // helmet
  addBox(bike, 0.9, 0.8, 0.8, 0xffc233, 0, 1.2, 0.95);      // delivery box
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.22, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const z of [-0.8, 0.8]) {
    const w = new THREE.Mesh(wheelGeo, lam(0x111111));
    w.position.set(0, 0.45, z);
    bike.add(w);
    wheels.push(w);
  }

  // Drop-off marker
  const marker = new THREE.Group();
  marker.visible = false;
  scene.add(marker);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.15, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0x4cff7a })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  marker.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x4cff7a, transparent: true, opacity: 0.25, depthWrite: false })
  );
  beam.position.y = 30;
  marker.add(beam);

  // ---- Traffic factories --------------------------------------------------
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
  const objs = []; // { kind, group, vx, vz, hw, hl, hit, endX }
  const G = {};

  function resetRun() {
    for (const o of objs) scene.remove(o.group);
    objs.length = 0;
    Object.assign(G, {
      state: 'start',
      dist: 0,            // distance travelled; rider's world z is -dist
      speed: CRUISE,
      x: 0,
      vx: 0,
      health: 100,
      score: 0,
      combo: 1,
      delivered: 0,
      order: null,
      food: 100,
      timeLeft: 0,
      msgT: 0,
      spawnT: 0,
      pedT: 0,
      coneT: 0,
      shake: 0,
      job: null,
      phase: 'pickup',
      earned: 0,
      honkT: 0,
      lowWarned: false,
      t: 0
    });
    marker.visible = false;
  }

  function addObj(kind, group, x, z, vx, vz, hw, hl, extra) {
    group.position.set(x, 0, z);
    scene.add(group);
    const o = { kind: kind, group: group, vx: vx, vz: vz, hw: hw, hl: hl, hit: false, endX: 0 };
    if (extra) Object.assign(o, extra);
    objs.push(o);
  }

  function spawnCar() {
    const oncoming = Math.random() < 0.35;
    const x = oncoming ? -3.5 : pick([0, 3.5]);
    const vz = oncoming ? rand(10, 16) : -rand(9, 16);
    addObj('car', makeCar(), x, -(G.dist + 170), 0, vz, 1, 2);
  }

  function spawnCone() {
    addObj('cone', makeCone(), pick(LANES), -(G.dist + rand(150, 190)), 0, 0, 0.5, 0.5);
  }

  function spawnPed() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const vx = dir * 2.2;
    addObj('ped', makePed(), -dir * 9, -(G.dist + rand(90, 160)), vx, 0, 0.4, 0.4, { endX: dir * 9.5 });
  }

  function flash(text, color) {
    const el = document.getElementById('msg');
    el.textContent = text;
    el.style.color = color || '#fff';
    el.style.opacity = 1;
    G.msgT = 1.6;
  }

  function showPanel(html, buttonText) {
    const panel = document.getElementById('panel');
    panel.innerHTML = html + '<br><button id="go">' + buttonText + '</button>';
    document.getElementById('overlay').style.display = 'flex';
  }

  function hidePanel() {
    document.getElementById('overlay').style.display = 'none';
  }

  // ---- Jobs ---------------------------------------------------------------
  const TIERS = {
    easy:   { label: 'EASY',   color: '#4cff7a', traffic: 0.65, timeF: 1.8, decay: 0.3, base: 80,  pk: [110, 190], dr: [150, 250], unlock: 0 },
    medium: { label: 'MEDIUM', color: '#ffc233', traffic: 1.0,  timeF: 1.4, decay: 0.7, base: 190, pk: [150, 250], dr: [210, 330], unlock: 400 },
    hard:   { label: 'HARD',   color: '#ff5a5a', traffic: 1.6,  timeF: 1.1, decay: 1.2, base: 420, pk: [190, 300], dr: [290, 440], unlock: 1200 }
  };
  const MENU = {
    easy:   [['☕', 'Coffee run', 'Corner Café'], ['🥯', 'Bagel box', 'Bagel Barn'], ['🥗', 'Salad bowl', 'Green Leaf']],
    medium: [['🍕', 'Hot pizza', "Tony's Pizza"], ['🍔', 'Burger combo', 'Burger Hut'], ['🍜', 'Noodle soup', 'Wok Express']],
    hard:   [['🍣', 'Sushi platter', 'Sushi Zen'], ['🍦', 'Ice cream (melts fast!)', "Frosty's"], ['🎂', 'Wedding cake', 'Sweet Tiers Bakery']]
  };
  const CUSTOMERS = ['Mrs. Lee', 'Big Mike', 'Apt 4B', 'The Garcias', 'Dr. Patel', 'Night shift crew'];

  function makeJob(tierKey) {
    const T = TIERS[tierKey], m = pick(MENU[tierKey]);
    const pk = Math.round(rand(T.pk[0], T.pk[1])), dr = Math.round(rand(T.dr[0], T.dr[1]));
    return {
      tier: tierKey, icon: m[0], item: m[1], shop: m[2], customer: pick(CUSTOMERS), pk: pk, dr: dr,
      time: Math.round((pk + dr) / 24 * T.timeF + 8), pay: Math.round(T.base * rand(0.95, 1.2))
    };
  }

  function showBoard(note) {
    G.state = 'board';
    G.job = null; G.order = null; marker.visible = false;
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

  function setTarget(z, x, color) {
    G.order = { z: z, dropX: x };
    marker.position.set(x, 0, z);
    ring.material.color.setHex(color);
    beam.material.color.setHex(color);
    marker.visible = true;
  }

  function startJob(job) {
    audioInit();
    G.job = job; G.phase = 'pickup'; G.state = 'play';
    G.timeLeft = job.time; G.food = 100; G.lowWarned = false;
    hidePanel();
    setTarget(-(G.dist + job.pk), pick(LANES), 0x4cc2ff);
    say(job.tier === 'easy' ? 'v_easy' : job.tier === 'medium' ? 'v_mid' : 'v_hard');
    flash('Pick up at ' + job.shop, '#4cc2ff');
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
    const panel = document.getElementById('panel');
    panel.innerHTML = '<h1>Shift over</h1><p>Orders delivered: <b>' + G.delivered + '</b></p><p>Money earned: <b>$' + G.earned + '</b></p><p>Score: <b>' + G.score + '</b></p><br><button id="go">New shift</button>';
    document.getElementById('overlay').style.display = 'flex';
  }

  function pickedUp() {
    G.phase = 'deliver';
    play('pickup', 0.8);
    say('v_pickedup');
    setTarget(G.order.z - G.job.dr, pick(LANES), 0x4cff7a);
    flash('Got it! Deliver to ' + G.job.customer, '#4cff7a');
  }

  function deliver() {
    const T = TIERS[G.job.tier];
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

  function crash(o) {
    o.hit = true;
    G.combo = 1;
    G.shake = 0.5;
    if (o.kind === 'car') {
      G.health -= 30; G.food -= 25; G.speed = Math.min(G.speed, 9);
      play('crash', 0.9); if (Math.random() < 0.6) say('v_crash');
      flash('CRASH!', '#ff5a5a');
    } else if (o.kind === 'cone') {
      G.health -= 8; G.food -= 10; G.speed *= 0.4; o.group.rotation.z = 1.3;
      play('cone', 0.9);
      flash('Cone!', '#ffb020');
    } else {
      G.health -= 35; G.food -= 20; G.speed = MIN_SPEED; o.group.rotation.x = Math.PI / 2;
      play('crash', 0.6); say('v_ped', true);
      flash('Pedestrian hit!', '#ff5a5a');
    }
    if (G.health <= 0) { G.health = 0; gameOver(); }
  }

  // ---- Per-frame logic ----------------------------------------------------
  function update(dt) {
    const T = TIERS[G.job.tier];
    // Controls: finger drag (left/right steers, up/down = faster/slower), or keys
    let steerTarget = null, speedTarget = CRUISE;
    if (ptr) {
      steerTarget = clamp(ptr.bx + (ptr.x - ptr.sx) / window.innerWidth * 16, -5, 5);
      speedTarget = clamp(CRUISE + (ptr.sy - ptr.y) / window.innerHeight * 70, MIN_SPEED, MAX_SPEED);
    } else {
      if (keys.ArrowUp || keys.KeyW) speedTarget = MAX_SPEED;
      else if (keys.ArrowDown || keys.KeyS) speedTarget = MIN_SPEED;
    }
    const rate = speedTarget > G.speed ? 16 : 26;
    G.speed += clamp(speedTarget - G.speed, -rate * dt, rate * dt);
    if (!ptr && !(keys.ArrowUp || keys.KeyW || keys.ArrowDown || keys.KeyS)) G.speed += (CRUISE - G.speed) * Math.min(1, 1.2 * dt);
    let vxT;
    if (steerTarget !== null) vxT = clamp((steerTarget - G.x) * 7, -STEER * 1.6, STEER * 1.6);
    else vxT = ((keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0)) * STEER;
    G.vx += (vxT - G.vx) * Math.min(1, 12 * dt);
    G.x = clamp(G.x + G.vx * dt, -5, 5);
    G.dist += G.speed * dt;
    const pz = -G.dist;
    setEngine(G.speed);

    // Timers and food (food only cools once you have it)
    G.timeLeft -= dt;
    if (G.phase === 'deliver') G.food -= T.decay * FOOD_DECAY / 0.7 * dt;
    if (G.timeLeft < 8 && !G.lowWarned) { G.lowWarned = true; say('v_clock'); }
    if (G.timeLeft <= 0) return failJob('Too late!', 'v_late');
    if (G.food <= 0) return failJob('Food went cold!', 'v_cold');

    // Pick-up / drop-off: just ride through the ring
    const ahead = pz - G.order.z;
    if (ahead > -4 && ahead < 8 && Math.abs(G.x - G.order.dropX) < 2.6) {
      if (G.phase === 'pickup') pickedUp(); else return deliver();
    } else if (ahead < -4) {
      return failJob('Missed it!', 'v_missed');
    }

    // Traffic
    const diff = T.traffic * Math.min(1.5, 1 + G.delivered * 0.04);
    G.spawnT -= dt; G.pedT -= dt; G.coneT -= dt;
    if (G.spawnT <= 0) { spawnCar(); G.spawnT = rand(0.9, 1.5) / diff; }
    if (G.pedT <= 0) { spawnPed(); G.pedT = rand(3, 5.5) / diff; }
    if (G.coneT <= 0) { spawnCone(); G.coneT = rand(1.8, 3.3) / diff; }
    G.honkT -= dt;

    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      o.group.position.x += o.vx * dt;
      o.group.position.z += o.vz * dt;
      const p = o.group.position;
      const behind = p.z > pz + 25;
      const far = p.z < pz - 320;
      const crossed = o.kind === 'ped' && ((o.vx > 0 && p.x > o.endX) || (o.vx < 0 && p.x < o.endX));
      if (behind || far || crossed) { scene.remove(o.group); objs.splice(i, 1); }
    }

    for (const o of objs) {
      if (o.hit) continue;
      const dx = Math.abs(o.group.position.x - G.x);
      const dz = Math.abs(o.group.position.z - pz);
      if (dx < o.hw + PLAYER_HW && dz < o.hl + PLAYER_HL) {
        crash(o);
        if (G.state !== 'play') return;
      } else if (o.kind === 'car' && !o.honked && dz < 4 && dx < 2.4 && dx >= o.hw + PLAYER_HW && G.honkT <= 0) {
        o.honked = true; G.honkT = 4; play('horn', 0.35);   // near miss: the other driver honks
      }
    }
  }

  // Visuals that follow or recycle regardless of state
  function syncScene(dt, now) {
    const pz = -G.dist;
    bike.position.set(G.x, 0, pz);
    bike.rotation.z = -G.vx * 0.04;
    for (const w of wheels) w.rotation.x -= G.speed * dt / 0.45;

    grass.position.z = pz - 150;
    road.position.z = pz - 150;
    sidewalkL.position.z = pz - 150;
    sidewalkR.position.z = pz - 150;

    for (const d of dashes) {
      if (d.position.z > pz + 10) d.position.z -= DASH_LOOP;
    }
    for (const b of buildings) {
      if (b.position.z > pz + 30) {
        b.position.z -= BLDG_LOOP;
        resetBuilding(b);
      }
    }

    if (G.order && marker.visible) {
      marker.position.z = G.order.z;
      const pulse = 1 + 0.08 * Math.sin(now * 0.006);
      ring.scale.set(pulse, pulse, pulse);
    }

    // Chase camera with a little shake after crashes
    G.shake = Math.max(0, G.shake - dt * 1.5);
    const k = 1 - Math.exp(-8 * dt);
    camera.position.x += (G.x * 0.6 - camera.position.x) * k;
    camera.position.y += (3.4 - camera.position.y) * k;
    camera.position.z = pz + 7.5;
    const sx = (Math.random() - 0.5) * G.shake * 0.6;
    const sy = (Math.random() - 0.5) * G.shake * 0.4;
    camera.lookAt(G.x * 0.6 + sx, 1.2 + sy, pz - 9);
  }

  function updateHUD() {
    const pz = -G.dist;
    const setText = (id, t) => { document.getElementById(id).textContent = t; };
    setText('score', G.score);
    setText('combo', 'x' + G.combo);
    const timeEl = document.getElementById('time');
    timeEl.textContent = Math.max(0, Math.ceil(G.timeLeft));
    timeEl.style.color = G.timeLeft < 5 ? '#ff5a5a' : '#fff';
    setText('distlabel', G.phase === 'pickup' ? 'To pickup' : 'To drop-off');
    setText('dist', G.order && G.state === 'play' ? Math.max(0, Math.round(pz - G.order.z)) + 'm' : '-');
    document.querySelector('#healthBar > div').style.width = clamp(G.health, 0, 100) + '%';
    document.querySelector('#foodBar > div').style.width = clamp(G.food, 0, 100) + '%';

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
    ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, bx: G.x };
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
  window.DD = { G: G, marker: marker };
  {
    const panel = document.getElementById('panel');
    panel.innerHTML = '<h1>Dash Delivery</h1>' +
      '<p>Pick a job, ride to the <b style="color:#4cc2ff">blue</b> ring to pick up the order, then to the <b style="color:#4cff7a">green</b> ring to deliver it.</p>' +
      '<p><b>Drag your finger</b>: left / right to steer, up to go faster, down to slow down. Let go to cruise.</p>' +
      '<p class="hint">Harder jobs pay more but have more traffic and less time. Keep the food hot.</p><br><button id="go">Start shift</button>';
  }
  requestAnimationFrame(frame);
})();
