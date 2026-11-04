# Last Line Asteroids

Arcade Asteroids with a story, voice acting, sound effects, a soundtrack, six kinds of asteroid fields, a force field, grenades,
automatic upgrades and a boss. Plays on computers and phones.

**Play it:** https://boweryking.github.io/moon-attack-/

- **Computer:** Enter starts. Arrow keys steer and thrust, Space fires, S holds the shield, B throws a grenade, Shift warps, P pauses, M mutes, C toggles the CRT effects.
- **iPhone / Android:** hold the phone sideways and tap to start. On iPhone, tap Share, then **Add to Home Screen** for a full-screen app icon that also works offline.
- **Run it yourself:** download the repo, open the `docs` folder and double-click `index.html`.

**Also here:** [Last Colony](docs/last-colony/) - a Defender-style game (play at `/last-colony/` on the same site).

The Asteroids game lives in `docs/` (that is the folder GitHub Pages publishes). Sound files are in `docs/audio/` - see `docs/audio/README.md`.
When you replace an audio file, bump `VERSION` in `docs/sw.js` so devices refresh their offline copy.

---

# Moonrise Defense (the original game in this repo)

A fast-paced space shooter game where you defend the Moonrise base from waves of alien invaders!

## How to Play

1. Open `index.html` in a web browser
2. Click "START GAME" to begin
3. Use **Arrow Keys** (← →) to move your spaceship left and right
4. Press **SPACE** to shoot at enemies
5. Survive waves of increasingly difficult alien attacks
6. Don't let your health reach zero!

## Features

- **Wave System**: Each wave brings more enemies
- **Health System**: Start with 100 health, lose 10 per hit, lose 50 if an enemy crashes into you
- **Scoring**: Earn 10 points per enemy destroyed
- **Enemy AI**: Aliens move horizontally and shoot back at you
- **Visual Effects**: Particle explosions, glowing effects, and animated starfield
- **Responsive Controls**: Smooth spaceship movement

## Game Mechanics

- **Player Ship**: Cyan spaceship that shoots upward
- **Enemies**: Purple/magenta alien ships that shoot red projectiles
- **Collision**: Bullets destroy enemies, enemy bullets damage you
- **Progression**: Waves get harder with more enemies spawning

## Technologies

- HTML5 Canvas for rendering
- Pure JavaScript for game logic
- CSS3 for UI styling and animations

Enjoy defending Moonrise!
