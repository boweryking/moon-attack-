# Bug Bombers

An Angry Birds-style slingshot game where bugs bomb an ant infestation.

## Play

Open `index.html` in a browser (no build step, no server needed).

- **Aim:** drag the bug back in the slingshot. A dotted arc shows the path.
- **Fire:** let go.
- **In flight:** tap the canvas or press **Space**.
  - Bombardier Beetle detonates early.
  - Hornet dives straight down.
  - Stag Beetle has no ability. It's heavy and smashes what it lands on.
- **Win:** blow up every ant. Unused bugs are worth 2000 points each, and you get 1–3 stars.
- **Lose:** run out of bugs with ants still standing.
- **R** restarts the nest.

## Files

- `index.html`: page, styles, and overlays
- `js/game.js`: game logic, level maps, drawing, and input
- `js/matter.min.js`: [Matter.js](https://brm.io/matter-js/) 0.19.0 physics (MIT, license in `js/MATTER-LICENSE.txt`)

## Making a nest

Level maps live in `LEVELS` in `js/game.js`, one string per row, top to bottom:

| Char | Meaning |
| ---- | ------- |
| `#`  | stone block |
| `=`  | wood block |
| `~`  | leaf block (fragile) |
| `A`  | ant |
| `.`  | empty |

Every block needs a block (or the ground) directly beneath it, or it will drop when the nest loads.
