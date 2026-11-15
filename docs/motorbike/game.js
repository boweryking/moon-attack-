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
      deliverPressed: false,
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

  function newOrder() {
    const travel = rand(220, 380);
    const dropX = pick(LANES);
    G.order = { z: -(G.dist + travel), dropX: dropX };
    G.timeLeft = travel / 18 + 15;   // seconds
    G.food = 100;
    marker.position.set(dropX, 0, G.order.z);
    marker.visible = true;
  }

  function startRun() {
    resetRun();
    G.state = 'play';
    hidePanel();
    newOrder();
    flash('Order up! Ride to the green marker and press SPACE', '#fff');
  }

  function gameOver() {
    G.state = 'over';
    showPanel(
      '<h1>Shift over</h1>' +
      '<p>Orders delivered: <b>' + G.delivered + '</b></p>' +
      '<p>Final score: <b>' + G.score + '</b></p>',
      'New shift'
    );
  }

  function deliver() {
    const pay = 100 + Math.round(G.food);
    const bonus = Math.round(G.timeLeft) * 2;
    const gained = (pay + bonus) * G.combo;
    G.score += gained;
    G.combo = Math.min(G.combo + 1, 5);
    G.delivered++;
    flash('Delivered! +' + gained, '#4cff7a');
    newOrder();
  }

  function failOrder(text) {
    G.combo = 1;
    flash(text, '#ff5a5a');
    newOrder();
  }

  function crash(o) {
    o.hit = true;
    G.combo = 1;
    G.shake = 0.5;
    if (o.kind === 'car') {
      G.health -= 30;
      G.food -= 25;
      G.speed = Math.min(G.speed, 9);
      flash('CRASH!', '#ff5a5a');
    } else if (o.kind === 'cone') {
      G.health -= 8;
      G.food -= 10;
      G.speed *= 0.4;
      o.group.rotation.z = 1.3;
      flash('Cone!', '#ffb020');
    } else {
      G.health -= 35;
      G.food -= 20;
      G.speed = MIN_SPEED;
      o.group.rotation.x = Math.PI / 2;
      flash('Pedestrian hit!', '#ff5a5a');
    }
    if (G.health <= 0) {
      G.health = 0;
      gameOver();
    }
  }

  // ---- Per-frame logic ----------------------------------------------------
  function update(dt) {
    const kL = keys.ArrowLeft || keys.KeyA;
    const kR = keys.ArrowRight || keys.KeyD;
    const kU = keys.ArrowUp || keys.KeyW;
    const kD = keys.ArrowDown || keys.KeyS;

    // Speed: accelerate, brake, or drift back to cruise
    if (kU) G.speed = Math.min(MAX_SPEED, G.speed + 14 * dt);
    else if (kD) G.speed = Math.max(MIN_SPEED, G.speed - 22 * dt);
    else G.speed += (CRUISE - G.speed) * Math.min(1, 1.2 * dt);

    // Steering
    const steer = (kR ? 1 : 0) - (kL ? 1 : 0);
    G.vx += (steer * STEER - G.vx) * Math.min(1, 10 * dt);
    G.x = clamp(G.x + G.vx * dt, -5, 5);
    G.dist += G.speed * dt;
    const pz = -G.dist;

    // Timers and food
    G.timeLeft -= dt;
    G.food -= FOOD_DECAY * dt;
    if (G.timeLeft <= 0) return failOrder('Too late!');
    if (G.food <= 0) return failOrder('Food went cold!');

    // Drop-off
    const ahead = pz - G.order.z; // > 0 while the marker is still ahead
    if (G.deliverPressed) {
      G.deliverPressed = false;
      if (ahead > -4 && ahead < 8 && Math.abs(G.x - G.order.dropX) < 2.2) return deliver();
    }
    if (ahead < -4) return failOrder('Missed the drop-off!');

    // Spawning, harder as you deliver more
    const diff = Math.min(2.2, 1 + G.delivered * 0.06);
    G.spawnT -= dt; G.pedT -= dt; G.coneT -= dt;
    if (G.spawnT <= 0) { spawnCar(); G.spawnT = rand(0.9, 1.5) / diff; }
    if (G.pedT <= 0) { spawnPed(); G.pedT = rand(3, 5.5) / diff; }
    if (G.coneT <= 0) { spawnCone(); G.coneT = rand(1.8, 3.3) / diff; }

    // Move traffic and remove what's out of range
    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      o.group.position.x += o.vx * dt;
      o.group.position.z += o.vz * dt;
      const p = o.group.position;
      const behind = p.z > pz + 25;
      const far = p.z < pz - 320;
      const crossed = o.kind === 'ped' && ((o.vx > 0 && p.x > o.endX) || (o.vx < 0 && p.x < o.endX));
      if (behind || far || crossed) {
        scene.remove(o.group);
        objs.splice(i, 1);
      }
    }

    // Collisions (each object hurts you once)
    for (const o of objs) {
      if (o.hit) continue;
      const dx = Math.abs(o.group.position.x - G.x);
      const dz = Math.abs(o.group.position.z - pz);
      if (dx < o.hw + PLAYER_HW && dz < o.hl + PLAYER_HL) {
        crash(o);
        if (G.state !== 'play') return;
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
    setText('dist', G.order ? Math.max(0, Math.round(pz - G.order.z)) + 'm' : '-');
    document.querySelector('#healthBar > div').style.width = clamp(G.health, 0, 100) + '%';
    document.querySelector('#foodBar > div').style.width = clamp(G.food, 0, 100) + '%';

    if (G.msgT > 0) {
      G.msgT -= 1 / 60;
      if (G.msgT <= 0) document.getElementById('msg').style.opacity = 0;
    }
  }

  // ---- Input --------------------------------------------------------------
  const keys = {};
  const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

  window.addEventListener('keydown', function (e) {
    if (GAME_KEYS.indexOf(e.code) !== -1) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'Enter') {
      if (G.state === 'play') G.deliverPressed = true;
      else startRun();
    }
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('blur', function () { for (const k in keys) keys[k] = false; });

  document.getElementById('overlay').addEventListener('click', function (e) {
    if (e.target && e.target.id === 'go') startRun();
  });

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
  showPanel(
    '<h1>Dash Delivery</h1>' +
    '<p>Ride your bike through traffic to the green drop-off marker, then press <b>SPACE</b> to hand over the order.</p>' +
    '<p>Arrows / A D to steer, Up / W to speed up, Down / S to brake.</p>' +
    '<p class="hint">Avoid cars, pedestrians and cones. Keep the food hot. Deliver fast for a bigger tip and combo.</p>',
    'Start shift'
  );
  requestAnimationFrame(frame);
})();
