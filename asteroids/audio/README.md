# Asteroids audio

The game looks for these files and falls back to its built-in synth sounds for any that are missing
(voice lines just show as subtitles). Drop the ElevenLabs downloads in with these exact names.

Source flows (ElevenLabs): "Asteroids – Sound Effects", "Asteroids – Story & Mission Control",
and "Asteroids – Announcer Lines". Voices: Odom (announcer + story), Philippa (Control), Final Boss (alien saucer).

## `sfx/`
laser, thrust, boom_large, boom_medium, boom_small, ship_boom, ufo_loop, ufo_fire, ufo_boom, hyperspace,
extra_life, alarm, coin, game_over, shield, radio, space_ambience  (all `.mp3`)

## `voice/`
- Story: story1, story2, story3, story4
- Control (radio): ctrl_contact, ctrl_ship_lost, ctrl_last_ship, ctrl_cleared, ctrl_unidentified, ctrl_extra_ship, ctrl_all_lost
- Announcer: ann_title, ann_incoming, ann_extra_life, ann_game_over, ann_insert_coin, ann_high_score, ann_hyperspace, ann_accelerating, ann_pilot_down
- Alien saucer: alien_world_ends, alien_we_see_you, alien_earth_ours, alien_impossible

All voice lines are now used in the game.
