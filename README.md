# GrassRoots — The Uncensored Cannabis Community

A Reddit-style community site for cannabis growers, patients and enthusiasts. Currently a front-end prototype: it runs entirely in the browser with built-in sample data, no backend and no database.

## Run it

Open `index.html` in a browser. No build step.

## What works today

- **Communities** (`g/cultivation`, `g/strains`, `g/edibles`, `g/extracts`, `g/medical`, `g/CannabisNews`, `g/WeedMemes`, `g/trees`) with join/leave
- **Feed and posts** with Hot / New / Top style sorting
- **Voting** (requires login)
- **Nested comments** on each post
- **Create post** page (text / image / link / poll tabs)
- **Login / sign-up modal and profile page**, with a mock login: any username works

## What is fake (next steps)

- All posts, comments and member counts are hard-coded in `app.js`
- Login is simulated and nothing is saved; a refresh resets everything
- The image, link and poll post types are UI only
- Needs a real backend: accounts, a database, moderation, age (21+) gating

## Files

- `index.html`: page shell
- `app.js`: all app logic, routing, rendering and sample data
- `style.css`: styling

## History

This repo began as *Moonrise Defense*, an alien shooter game. That game is preserved in git history at commit `b9ca31c`.
