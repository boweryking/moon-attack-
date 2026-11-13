/* Bug Bombers — an Angry Birds-style slingshot game.
 * Bugs are the projectiles. Ants are the targets. Physics: Matter.js (js/matter.min.js).
 */
(function () {
  'use strict';

  const { Engine, World, Bodies, Body, Composite, Events, Vector, Sleeping } = window.Matter;

  // ---------- Constants ----------
  const W = 960, H = 540;
  const GROUND = 500;          // y of the ground surface
  const CELL = 40;             // size of one grid cell in level maps
  const GX = 430;              // x of the left edge of the level grid
  const SLING = { x: 190, y: 395 };  // resting position of the bug in the pouch
  const MAX_PULL = 105;
  const LAUNCH_K = 0.13;       // launch speed per px of pull
  const STEP = 1000 / 60;      // fixed physics step (ms)

  const BLOCK = {
    wood:  { hp: 60,  mult: 5, density: 0.0015, score: 30, color: '#c98a4b', edge: '#7a4a22' },
    stone: { hp: 150, mult: 5, density: 0.0040, score: 60, color: '#a9b0b8', edge: '#5b636d' },
    leaf:  { hp: 16,  mult: 7, density: 0.0006, score: 15, color: '#6cbf4e', edge: '#3d7a2a' },
  };
  const CHAR = { '#': 'stone', '=': 'wood', '~': 'leaf' };

  const BUG = {
    bombardier: {
      key: 'bombardier', name: 'Bombardier Beetle', radius: 13, density: 0.0016,
      bomb: true, tap: 'detonate', blast: { r: 115, power: 70, knock: 12, color: '#ff9f1c' },
      body: '#1f7a6f', accent: '#ff9f1c', tip: 'Tap or Space mid-flight to detonate early.',
    },
    hornet: {
      key: 'hornet', name: 'Hornet', radius: 10, density: 0.0012,
      bomb: true, tap: 'dive', blast: { r: 62, power: 34, knock: 8, color: '#ffd166' },
      body: '#f4c430', accent: '#222', tip: 'Tap or Space mid-flight to dive straight down.',
    },
    stag: {
      key: 'stag', name: 'Stag Beetle', radius: 17, density: 0.0035,
      bomb: false, tap: null, blast: null,
      body: '#7a4e2d', accent: '#3b2414', tip: 'Heavy. Smashes whatever it lands on.',
    },
  };

  // Level maps: rows top→bottom, 12 cols max.
  // '#' stone, '=' wood, '~' leaf, 'A' ant, '.' empty.
  const LEVELS = [
    {
      name: 'Crumb Pile',
      bugs: ['bombardier', 'hornet', 'hornet'],
      map: [
        '....A.......',
        '...A===A....',
        '...=====....',
        '..=======...',
        '..#######...',
      ],
    },
    {
      name: 'Leaf Pile',
      bugs: ['hornet', 'bombardier', 'stag', 'hornet'],
      map: [
        '............',
        '...A.A.A....',
        '..~~~~~~~...',
        '..#~~~~~#...',
        '..#~~~~~#...',
        'A.#######...',
      ],
    },
    {
      name: 'Stone Fort',
      bugs: ['stag', 'bombardier', 'bombardier', 'hornet'],
      map: [
        '...A..A.....',
        '...##.##....',
        '...##A##....',
        '...#####....',
        '...#####....',
      ],
    },
    {
      name: 'Hive',
      bugs: ['bombardier', 'hornet', 'bombardier', 'stag'],
      map: [
        '............',
        '....A.A.....',
        '...=====....',
        '..A=#=#=A...',
        '...=#=#=....',
        '...=#=#=....',
        '...#####....',
      ],
    },
    {
      name: 'Ant Empire',
      bugs: ['bombardier', 'hornet', 'bombardier', 'stag', 'hornet'],
      map: [
        '....A.A.....',
        '....===.....',
        '..A=====A...',
        '..~~=====...',
        '..#######...',
        'A.#######...',
      ],
    },
  ];

  // ---------- DOM ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  // On a wide, short screen (a phone held sideways) crop the empty sky off the top so the playfield fills the whole screen
  // and everything is drawn bigger. VH is how much of the world's height is visible; OFF is the world y at the top of the view.
  let VH = H, OFF = 0;
  const wrapEl = document.getElementById('wrap');
  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const ar = Math.max(W / H, Math.min(2.3, vw / vh));   // between 16:9 and 2.3:1
    VH = Math.round(W / ar); OFF = H - VH;
    const w = Math.min(vw, vh * ar);
    wrapEl.style.width = w + 'px'; wrapEl.style.height = (w / ar) + 'px';
    canvas.width = W * DPR; canvas.height = VH * DPR;
  }
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 250));

  const titleEl = document.getElementById('title');
  const endEl = document.getElementById('end');
  const endTitle = document.getElementById('endTitle');
  const endStars = document.getElementById('endStars');
  const endText = document.getElementById('endText');
  const nextBtn = document.getElementById('nextBtn');
  const retryBtn = document.getElementById('retryBtn');

  // ---------- Physics ----------
  const engine = Engine.create({ enableSleeping: true, positionIterations: 16, velocityIterations: 10 });
  // Matter moves bodies by velocity px per step; gravity adds this much per step.
  const GRAVITY_PER_STEP = engine.gravity.y * engine.gravity.scale * STEP * STEP;

  let S = null;     // current level state
  let carry = 0;    // score banked from cleared nests

  function newState(i) {
    return {
      level: i,
      queue: LEVELS[i].bugs.slice(),
      bugs: [],
      ants: [],
      active: null,            // last launched bug
      phase: 'aim',            // 'aim' | 'flight'
      pull: { x: 0, y: 0 },
      dragging: false,
      score: 0,
      stars: 0,
      mode: 'playing',         // 'playing' | 'won' | 'lost'
      endTimer: 0,
      loseTimer: 0,
      pendingBlasts: [],
      pendingRemove: [],
      blasts: [],
      parts: [],
      popups: [],
      shake: 0,
      hint: 360,
      time: 0,
    };
  }

  function buildWorld(i) {
    const ground = Bodies.rectangle(W / 2, GROUND + 40, W * 3, 80, { isStatic: true, label: 'ground', friction: 0.9, frictionStatic: 1 });
    const wallL = Bodies.rectangle(-30, H / 2, 60, H * 4, { isStatic: true, label: 'wall' });
    const wallR = Bodies.rectangle(W + 30, H / 2, 60, H * 4, { isStatic: true, label: 'wall' });
    World.add(engine.world, [ground, wallL, wallR]);

    const map = LEVELS[i].map;
    const topY = GROUND - map.length * CELL;
    const bodies = [];
    map.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        const x = GX + c * CELL + CELL / 2;
        const y = topY + r * CELL + CELL / 2;
        if (CHAR[ch]) {
          const kind = CHAR[ch];
          bodies.push(Bodies.rectangle(x, y, CELL - 0.5, CELL - 0.5, {
            label: 'block', friction: 0.8, frictionStatic: 1, restitution: 0, density: BLOCK[kind].density,
            userData: { kind, hp: BLOCK[kind].hp, max: BLOCK[kind].hp, dead: false },
          }));
        } else if (ch === 'A') {
          const ant = makeAnt(x, y);
          S.ants.push(ant);
          bodies.push(ant);
        }
      }
    });
    World.add(engine.world, bodies);
  }

  function makeAnt(x, y) {
    return Bodies.circle(x, y, 7, {
      label: 'ant', friction: 0.8, restitution: 0, density: 0.002, inertia: Infinity,
      userData: { dead: false },
    });
  }

  function makeBugBody(type, x, y) {
    return Bodies.circle(x, y, type.radius, {
      label: 'bug', friction: 0.4, restitution: 0.25, density: type.density,
      frictionAir: 0.002, inertia: Infinity,
    });
  }

  function startLevel(i) {
    World.clear(engine.world, false);
    S = newState(i);
    buildWorld(i);
    // Let the nest settle before the player can act, so it starts stable.
    for (let k = 0; k < 150; k++) { Engine.update(engine, STEP); S.time++; }
    hideOverlays();
  }

  // ---------- Collisions & effects ----------
  Events.on(engine, 'collisionStart', (ev) => {
    for (const pair of ev.pairs) onCollision(pair.bodyA, pair.bodyB);
  });
  Events.on(engine, 'beforeUpdate', () => {
    for (const b of S.pendingBlasts.splice(0)) applyBlast(b);
  });
  Events.on(engine, 'afterUpdate', () => {
    stepBugs();
    flushRemovals();
  });

  function onCollision(a, b) {
    const speed = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
    const settling = S.time < 60;   // nests settle for a second before anything can break
    for (const [x, y] of [[a, b], [b, a]]) {
      if (x.label === 'ant' && y.label !== 'ant') {
        if (!settling && speed > (y.label === 'bug' ? 1.6 : 9)) killAnt(x);
      } else if (x.label === 'block' && y.label !== 'ant') {
        if (!settling && speed > 3.5) damageBlock(x, (speed - 3.5) * BLOCK[x.userData.kind].mult);
      } else if (x.label === 'bug' && y.label !== 'bug') {
        const bug = x.userData;
        if (bug.state === 'flying' && bug.age > 3 && speed > 2 && bug.type.bomb) bombNow(bug);
      }
    }
  }

  function damageBlock(body, amount) {
    const ud = body.userData;
    if (ud.dead) return;
    ud.hp -= amount * (ud.kind === 'stone' ? 0.6 : 1);
    if (ud.hp <= 0) {
      ud.dead = true;
      S.pendingRemove.push(body);
      S.score += BLOCK[ud.kind].score;
      spawnDebris(body.position.x, body.position.y, BLOCK[ud.kind].color, 10);
    }
  }

  function killAnt(body) {
    const ud = body.userData;
    if (ud.dead) return;
    ud.dead = true;
    S.pendingRemove.push(body);
    S.score += 1000;
    spawnDebris(body.position.x, body.position.y, '#3b2a1a', 9);
    popup(body.position.x, body.position.y - 14, '+1000');
    sfx('pop');
  }

  function bombNow(bug) {
    if (bug.exploded) return;
    bug.exploded = true;
    bug.state = 'done';
    const p = bug.body.position;
    S.pendingBlasts.push({ x: p.x, y: p.y, r: bug.type.blast.r, power: bug.type.blast.power,
      knock: bug.type.blast.knock, color: bug.type.blast.color });
    S.pendingRemove.push(bug.body);
  }

  function applyBlast(b) {
    S.blasts.push({ x: b.x, y: b.y, r: b.r, t: 0, color: b.color });
    S.shake = Math.max(S.shake, b.power / 5);
    spawnDebris(b.x, b.y, b.color, 16);
    sfx('boom');
    for (const body of Composite.allBodies(engine.world)) {
      if (body.isStatic) continue;
      if (body.label === 'bug' && body.userData.exploded) continue;
      const dx = body.position.x - b.x, dy = body.position.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d > b.r) continue;
      const f = 1 - d / b.r;
      if (body.label === 'block') damageBlock(body, b.power * f);
      else if (body.label === 'ant') killAnt(body);
      const nx = d > 0.5 ? dx / d : 0, ny = d > 0.5 ? dy / d : -1;
      const k = b.knock * f * Math.min(1, 1 / Math.sqrt(body.mass));
      Sleeping.set(body, false);
      Body.setVelocity(body, { x: body.velocity.x + nx * k, y: body.velocity.y + ny * k - 2 * f });
    }
  }

  function stepBugs() {
    for (const bug of S.bugs) {
      if (bug.state !== 'flying') continue;
      bug.age++;
      const v = bug.body.velocity;
      bug.settle = Math.hypot(v.x, v.y) < 0.6 ? bug.settle + 1 : 0;
      const p = bug.body.position;
      const offscreen = p.x > W + 150 || p.x < -100 || p.y > H + 250;
      if (offscreen || bug.settle > 40 || bug.age > 900) {
        bug.state = 'done';
        if (bug.type.bomb) bombNow(bug);     // bombers always go off, even if they fizzle
        if (offscreen) S.pendingRemove.push(bug.body);
      }
    }
  }

  function flushRemovals() {
    for (const body of S.pendingRemove.splice(0)) {
      if (body.label === 'bug') body.userData.removed = true;
      World.remove(engine.world, body);
    }
  }

  function tapActive() {
    const bug = S.active;
    if (!bug || bug.state !== 'flying' || S.mode !== 'playing') return;
    if (bug.type.tap === 'detonate') {
      bombNow(bug);
    } else if (bug.type.tap === 'dive') {
      const v = bug.body.velocity;
      Body.setVelocity(bug.body, { x: v.x * 0.35, y: Math.max(v.y, 0) + 14 });
      sfx('dive');
    }
  }

  function spawnDebris(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 6;
      S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, life: 40 + Math.random() * 25, max: 65, color, size: 2 + Math.random() * 4 });
    }
  }

  function popup(x, y, text) {
    S.popups.push({ x, y, text, life: 60 });
  }

  // ---------- Launch & aim ----------
  function launch() {
    const pull = S.pull;
    if (Math.hypot(pull.x, pull.y) < 12 || S.queue.length === 0 || S.phase !== 'aim') {
      S.pull = { x: 0, y: 0 };
      S.dragging = false;
      return;
    }
    const key = S.queue.shift();
    const type = BUG[key];
    const body = makeBugBody(type, SLING.x + pull.x, SLING.y + pull.y);
    const bug = { type, body, state: 'flying', settle: 0, age: 0, exploded: false, removed: false };
    body.userData = bug;
    Body.setVelocity(body, { x: -pull.x * LAUNCH_K, y: -pull.y * LAUNCH_K });
    World.add(engine.world, body);
    S.bugs.push(bug);
    S.active = bug;
    S.phase = 'flight';
    S.pull = { x: 0, y: 0 };
    S.dragging = false;
    S.hint = 0;
    sfx('launch');
  }

  function worldSettled() {
    for (const b of Composite.allBodies(engine.world)) {
      if (b.isStatic) continue;
      if (Math.hypot(b.velocity.x, b.velocity.y) > 0.35) return false;
    }
    return true;
  }

  function checkOutcome() {
    if (S.mode !== 'playing') return;
    if (S.phase === 'flight' && !S.bugs.some((b) => b.state === 'flying')) {
      S.phase = 'aim';
      S.loseTimer = 0;
    }
    const alive = S.ants.some((a) => !a.userData.dead);
    if (!alive) {
      if (++S.endTimer > 50 && S.pendingBlasts.length === 0) endLevel(true);
      return;
    }
    if (S.phase === 'aim' && S.queue.length === 0) {
      S.loseTimer++;
      if ((S.loseTimer > 60 && worldSettled()) || S.loseTimer > 600) endLevel(false);
    }
  }

  function endLevel(won) {
    S.mode = won ? 'won' : 'lost';
    S.pull = { x: 0, y: 0 };
    S.dragging = false;
    const last = S.level === LEVELS.length - 1;
    if (won) {
      const left = S.queue.length;
      S.stars = left >= 2 ? 3 : left === 1 ? 2 : 1;
      S.score += left * 2000;
      endTitle.textContent = last ? 'All nests cleared!' : 'Nest cleared!';
      endStars.textContent = '★'.repeat(S.stars) + '☆'.repeat(3 - S.stars);
      endText.textContent = `Nest score ${S.score}` + (left ? ` (includes ${left} unused bug${left > 1 ? 's' : ''} × 2000)` : '') + ` · Total ${carry + S.score}`;
      nextBtn.textContent = last ? 'Play again' : 'Next nest';
    } else {
      endTitle.textContent = 'Out of bugs!';
      endStars.textContent = '';
      endText.textContent = 'Some ants are still standing. Try a different angle.';
      nextBtn.textContent = 'Try again';
    }
    retryBtn.hidden = !won;
    endEl.hidden = false;
  }

  function hideOverlays() {
    titleEl.hidden = true;
    endEl.hidden = true;
  }

  function overlayOpen() {
    return !titleEl.hidden || !endEl.hidden;
  }

  // ---------- Input ----------
  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * VH / r.height + OFF };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (overlayOpen() || S.mode !== 'playing') return;
    unlockAudio();
    if (S.active && S.active.state === 'flying') { tapActive(); return; }
    if (S.phase !== 'aim' || S.queue.length === 0) return;
    const p = toLogical(e);
    const bugPos = { x: SLING.x + S.pull.x, y: SLING.y + S.pull.y };
    if (Math.hypot(p.x - bugPos.x, p.y - bugPos.y) < 55) {
      S.dragging = true;
      S.hint = 0;
      canvas.setPointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!S.dragging) return;
    const p = toLogical(e);
    let dx = Math.min(p.x - SLING.x, 12);   // can't pull past the slingshot
    let dy = p.y - SLING.y;
    const m = Math.hypot(dx, dy);
    if (m > MAX_PULL) { dx *= MAX_PULL / m; dy *= MAX_PULL / m; }
    S.pull = { x: dx, y: dy };
  });

  const release = (e) => {
    if (!S.dragging) return;
    if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    launch();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { S.dragging = false; S.pull = { x: 0, y: 0 }; });

  window.addEventListener('keydown', (e) => {
    if (overlayOpen()) return;
    if (e.code === 'Space') { e.preventDefault(); tapActive(); }
    if (e.key === 'r' || e.key === 'R') startLevel(S.level);
  });

  document.getElementById('playBtn').addEventListener('click', () => {
    unlockAudio();
    carry = 0;
    startLevel(0);
  });
  document.getElementById('restartBtn').addEventListener('click', () => startLevel(S.level));
  retryBtn.addEventListener('click', () => startLevel(S.level));
  nextBtn.addEventListener('click', () => {
    if (S.mode === 'won') {
      // Bank this nest's score only when moving on.
      if (S.level < LEVELS.length - 1) { carry += S.score; startLevel(S.level + 1); }
      else { carry = 0; startLevel(0); }
    } else {
      startLevel(S.level);
    }
  });

  // ---------- Audio (tiny synth, optional) ----------
  let audioCtx = null;
  function unlockAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* audio is optional */ }
  }
  function sfx(name) {
    if (!audioCtx) return;
    try {
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      if (name === 'launch') { o.type = 'triangle'; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(620, t + 0.18); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); }
      else if (name === 'pop') { o.type = 'sine'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.12); g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14); }
      else if (name === 'dive') { o.type = 'sawtooth'; o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.4); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4); }
      else { o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.45); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); }
      o.start(t); o.stop(t + 0.55);
    } catch (e) { /* ignore */ }
  }

  // ---------- Drawing ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, '#5fb8f0');
    g.addColorStop(1, '#d6f1ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // sun
    const sx = 860, sy = 80;
    const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 110);
    sg.addColorStop(0, 'rgba(255,240,150,0.9)');
    sg.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx - 120, sy - 120, 240, 240);
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.arc(sx, sy, 34, 0, Math.PI * 2); ctx.fill();
    // clouds
    for (let i = 0; i < 4; i++) {
      const x = ((i * 300 + S.time * (0.12 + i * 0.03)) % (W + 240)) - 120;
      const y = 60 + (i * 47) % 110;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.arc(x + 28, y - 10, 32, 0, Math.PI * 2);
      ctx.arc(x + 62, y, 24, 0, Math.PI * 2);
      ctx.fill();
    }
    // hills
    ctx.fillStyle = '#a6e27f';
    ctx.beginPath(); ctx.ellipse(180, GROUND + 10, 360, 150, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8fd46a';
    ctx.beginPath(); ctx.ellipse(760, GROUND + 25, 420, 130, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawGround() {
    ctx.fillStyle = '#8d5a32';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#6b4224';
    for (let x = 0; x < W; x += 36) ctx.fillRect(x + ((x / 36) % 2) * 12, GROUND + 24, 14, 4);
    // grass lip
    ctx.fillStyle = '#5fbf45';
    ctx.fillRect(0, GROUND - 4, W, 10);
    ctx.beginPath();
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, GROUND + 6 + (x % 32 === 0 ? 3 : 0));
    ctx.lineTo(W, GROUND + 6); ctx.lineTo(0, GROUND + 6); ctx.closePath();
    ctx.fill();
  }

  function drawSlingBack() {
    const x = SLING.x, y = SLING.y;
    ctx.strokeStyle = '#6b4423';
    ctx.lineCap = 'round';
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(x, GROUND + 4); ctx.lineTo(x, y + 6); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#8a5a30';
    ctx.beginPath(); ctx.moveTo(x - 3, GROUND + 2); ctx.lineTo(x - 3, y + 8); ctx.stroke();
  }

  function drawSlingFront(bugPos) {
    const x = SLING.x, y = SLING.y;
    const L = { x: x - 16, y: y - 36 }, R = { x: x + 16, y: y - 36 };
    // prongs
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(L.x, L.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(R.x, R.y); ctx.stroke();
    // band (front)
    ctx.strokeStyle = '#3b2414';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(R.x, R.y); ctx.lineTo(bugPos.x + 6, bugPos.y - 2); ctx.stroke();
    // pouch
    ctx.fillStyle = '#4b2e18';
    ctx.beginPath(); ctx.ellipse(bugPos.x - 2, bugPos.y + 12, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = 'butt';
  }

  function drawBandBack(bugPos) {
    const x = SLING.x;
    const L = { x: x - 16, y: SLING.y - 36 };
    ctx.strokeStyle = '#3b2414';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(bugPos.x - 6, bugPos.y - 2); ctx.stroke();
  }

  function drawTrajectory() {
    const pos = { x: SLING.x + S.pull.x, y: SLING.y + S.pull.y };
    let v = { x: -S.pull.x * LAUNCH_K, y: -S.pull.y * LAUNCH_K };
    for (let i = 1; i <= 110; i++) {
      v = { x: v.x * (1 - 0.002), y: v.y * (1 - 0.002) + GRAVITY_PER_STEP };
      pos.x += v.x; pos.y += v.y;
      if (i % 6 === 0) {
        if (pos.y > GROUND || pos.x > W) break;
        ctx.fillStyle = `rgba(255,255,255,${0.85 - i / 160})`;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 3.2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawBlock(body) {
    const ud = body.userData, spec = BLOCK[ud.kind];
    const h = (CELL - 0.5) / 2, s = CELL - 0.5;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    roundRect(-h, -h, s, s, 5);
    ctx.fillStyle = spec.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = spec.edge;
    ctx.stroke();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(-h, -h, s, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(-h, h - 6, s, 6);
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 1.5;
    if (ud.kind === 'wood') {
      ctx.beginPath(); ctx.moveTo(-h, -4); ctx.lineTo(h, -6); ctx.moveTo(-h, 9); ctx.lineTo(h, 7); ctx.stroke();
    } else if (ud.kind === 'leaf') {
      ctx.beginPath(); ctx.moveTo(-h + 4, 0); ctx.lineTo(h - 4, 0); ctx.moveTo(0, -h + 4); ctx.lineTo(0, h - 4); ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(-h + 8, -h + 12, 4, 3); ctx.fillRect(h - 12, 4, 3, 3); ctx.fillRect(-4, h - 10, 4, 3);
    }
    const frac = ud.hp / ud.max;
    if (frac < 0.6) {
      ctx.strokeStyle = 'rgba(40,20,5,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, -h); ctx.lineTo(2, 2); ctx.lineTo(-2, h); ctx.stroke();
    }
    if (frac < 0.3) {
      ctx.beginPath(); ctx.moveTo(h, -4); ctx.lineTo(4, 3); ctx.lineTo(h - 2, 10); ctx.stroke();
    }
    ctx.restore();
  }

  function drawAnt(body) {
    const t = S.time * 0.35 + body.id;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.strokeStyle = '#2b1d12';
    ctx.fillStyle = '#2b1d12';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    // legs
    for (let i = -1; i <= 1; i++) {
      const wig = Math.sin(t + i * 2) * 2;
      ctx.beginPath();
      ctx.moveTo(i * 3, -1); ctx.lineTo(i * 3 + wig, -8);
      ctx.moveTo(i * 3, 1); ctx.lineTo(i * 3 - wig, 8);
      ctx.stroke();
    }
    // antennae
    ctx.beginPath();
    ctx.moveTo(7, -1); ctx.quadraticCurveTo(10, -8, 13, -7);
    ctx.moveTo(7, 1); ctx.quadraticCurveTo(10, 8, 13, 7);
    ctx.stroke();
    // body segments
    ctx.beginPath(); ctx.arc(-5, 0, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1, 0, 3.6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6.5, 0, 3.2, 0, Math.PI * 2); ctx.fill();
    // eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(7.6, -1.2, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBug(type, x, y, facing, scale) {
    const r = type.radius;   // drawn in local units; ctx.scale handles size
    const cosF = Math.cos(facing), sinF = Math.sin(facing);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    // wings
    if (type.key === 'hornet') {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.strokeStyle = 'rgba(120,140,160,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(-3, -r - 2, 8, 4, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // body
    ctx.beginPath(); ctx.arc(0, 0, type.radius, 0, Math.PI * 2);
    ctx.fillStyle = type.body; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
    // shell highlight
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.ellipse(-2, -r * 0.45, r * 0.55, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    // markings
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, type.radius, 0, Math.PI * 2); ctx.clip();
    if (type.key === 'bombardier') {
      ctx.fillStyle = type.accent;
      ctx.beginPath(); ctx.arc(-r * 0.55, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a3d00';
      ctx.fillRect(-r * 0.55 - 2, -2, 4, 4);
    } else if (type.key === 'hornet') {
      ctx.fillStyle = type.accent;
      ctx.fillRect(-r * 0.2, -r, 4, r * 2);
      ctx.fillRect(r * 0.25, -r, 4, r * 2);
      ctx.fillRect(-r * 0.7, -r, 4, r * 2);
    } else if (type.key === 'stag') {
      ctx.fillStyle = type.accent;
      ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.35, r * 0.45, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // antennae
    ctx.strokeStyle = '#2b1d12'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cosF * r * 0.7 - sinF * 3, sinF * r * 0.7 + cosF * 3);
    ctx.quadraticCurveTo(cosF * r * 1.2, sinF * r * 1.2 - 8, cosF * r * 1.3 + 6, sinF * r * 1.3 - 9);
    ctx.stroke();
    if (type.key === 'stag') {
      // horns
      ctx.fillStyle = type.accent;
      ctx.beginPath();
      ctx.moveTo(cosF * r * 0.8 - sinF * 6, sinF * r * 0.8 + cosF * -6);
      ctx.lineTo(cosF * (r + 12) - sinF * 5, sinF * (r + 12) + cosF * -5);
      ctx.lineTo(cosF * r * 0.9 - sinF * 2, sinF * r * 0.9 + cosF * -2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cosF * r * 0.8 + sinF * 6, sinF * r * 0.8 - cosF * -6);
      ctx.lineTo(cosF * (r + 12) + sinF * 5, sinF * (r + 12) - cosF * -5);
      ctx.lineTo(cosF * r * 0.9 + sinF * 2, sinF * r * 0.9 - cosF * -2);
      ctx.fill();
    }
    // eyes, looking the way the bug is heading
    const ex = cosF * r * 0.5, ey = sinF * r * 0.5;
    const px = -sinF * r * 0.38, py = cosF * r * 0.38;
    for (const sgn of [1, -1]) {
      const cx = ex + px * sgn, cy = ey + py * sgn;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(cx + cosF * r * 0.1, cy + sinF * r * 0.1, r * 0.14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawEffects(dt) {
    // blasts
    for (const b of S.blasts) {
      const life = 28, p = b.t / life;
      const rr = b.r * (0.25 + 0.75 * (1 - Math.pow(1 - p, 3)));
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, rr * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = b.color; ctx.lineWidth = 6 * (1 - p) + 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      b.t++;
    }
    S.blasts = S.blasts.filter((b) => b.t < 28);
    // debris
    for (const p of S.parts) {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.vx *= 0.99;
      if (p.y > GROUND) { p.y = GROUND; p.vy *= -0.3; }
      p.life--;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    S.parts = S.parts.filter((p) => p.life > 0);
    // popups
    for (const p of S.popups) {
      p.y -= 0.7; p.life--;
      ctx.globalAlpha = Math.max(0, p.life / 60);
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = '#3a2a1a'; ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = '#fff3b0'; ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    S.popups = S.popups.filter((p) => p.life > 0);
  }

  function drawHUD() {
    const L = LEVELS[S.level];
    const ants = S.ants.filter((a) => !a.userData.dead).length;
    // left panel
    ctx.fillStyle = 'rgba(255,248,231,0.92)';
    roundRect(12, 12, 270, 60, 12); ctx.fill();
    ctx.fillStyle = '#3a2a1a';
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`Nest ${S.level + 1}: ${L.name}`, 26, 37);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`Score ${carry + S.score}`, 26, 59);
    // right panel: ants left
    ctx.fillStyle = 'rgba(255,248,231,0.92)';
    roundRect(W - 182, 12, 170, 60, 12); ctx.fill();
    ctx.fillStyle = '#3a2a1a';
    ctx.textAlign = 'left';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Ants left', W - 166, 37);
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(String(ants), W - 166, 62);
    // bug queue
    ctx.textAlign = 'left';
    S.queue.forEach((key, i) => {
      drawBug(BUG[key], 34 + i * 40, VH - 34, 0, 0.9);
    });
  }

  function drawFrame() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, -OFF * DPR);
    ctx.save();
    if (S.shake > 0.3) {
      ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);
      S.shake *= 0.85;
    } else {
      S.shake = 0;
    }
    drawSky();
    drawGround();
    drawSlingBack();

    const bugPos = { x: SLING.x + S.pull.x, y: SLING.y + S.pull.y };
    const readyKey = S.queue[0];
    const aiming = S.phase === 'aim' && S.queue.length > 0 && S.mode === 'playing';

    // world bodies
    for (const body of Composite.allBodies(engine.world)) {
      if (body.isStatic) continue;
      if (body.label === 'block') drawBlock(body);
      else if (body.label === 'ant') drawAnt(body);
      else if (body.label === 'bug' && !body.userData.removed) {
        const bug = body.userData;
        const v = body.velocity;
        const facing = Math.hypot(v.x, v.y) > 0.4 ? Math.atan2(v.y, v.x) : 0;
        drawBug(bug.type, body.position.x, body.position.y, facing, 1);
      }
    }

    if (aiming) {
      if (S.dragging) drawTrajectory();
      drawBandBack(bugPos);
      drawBug(BUG[readyKey], bugPos.x, bugPos.y, Math.atan2(-S.pull.y, -S.pull.x), 1);
      drawSlingFront(bugPos);
    } else {
      drawSlingFront({ x: SLING.x, y: SLING.y });
    }

    drawEffects();
    ctx.restore(); ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // the HUD sits on the screen, not in the world
    drawHUD();

    // hint text
    if (aiming && S.hint > 0 && !S.dragging) {
      S.hint--;
    }
    if (aiming && !S.dragging) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(25,14,40,0.75)';
      ctx.fillText(`${BUG[readyKey].name}: ${BUG[readyKey].tip}`, W / 2, 100);
      if (S.hint > 0) {
        ctx.font = '15px system-ui, sans-serif';
        ctx.fillText('Drag the bug back in the slingshot, then let go.', W / 2, 122);
      }
    }
    ctx.restore();
  }

  // ---------- Main loop ----------
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    acc += Math.min(100, now - last);
    last = now;
    let steps = 0;
    while (acc >= STEP && steps < 4) {
      Engine.update(engine, STEP);
      S.time++;
      acc -= STEP;
      steps++;
      checkOutcome();
    }
    if (steps === 4) acc = 0;
    drawFrame();
    requestAnimationFrame(frame);
  }

  // Start on the title screen with level 1 already built behind it.
  startLevel(0);
  titleEl.hidden = false;
  requestAnimationFrame(frame);

  // Small hook for automated checks.
  window.BugBombers = {
    get state() { return S; },
    startLevel,
    shoot(px, py) { S.pull = { x: px, y: py }; launch(); },
    tap: tapActive,
    engine,
    levels: LEVELS,
  };
})();
