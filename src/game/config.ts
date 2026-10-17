/** Fixed world-space view. Everything is authored in these coordinates. */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** Walkable interior; a 40 px wall frame surrounds it on every side. */
export const WALL_THICKNESS = 40;
export const CHAMBER_BOUNDS = {
  x: WALL_THICKNESS,
  y: WALL_THICKNESS,
  w: GAME_WIDTH - WALL_THICKNESS * 2,
  h: GAME_HEIGHT - WALL_THICKNESS * 2,
} as const;

/** Total authored chambers in the campaign (GDD §9). */
export const TOTAL_CHAMBERS = 6;

/** Render order, back to front. */
export const DEPTH = {
  floor: 0,
  decor: 1,
  shadow: 2,
  rune: 3,
  solid: 4,
  darkness: 4.5,
  beacon: 5,
  gate: 6,
  portal: 7,
  echo: 8,
  keeper: 9,
  light: 10,
  fx: 11,
  hint: 12,
  hud: 20,
  overlay: 30,
} as const;

/** GDD §5 palette as Phaser numeric colors. */
export const PALETTE = {
  night: 0x0a1023,
  slate: 0x17233b,
  wall: 0x24314d,
  gold: 0xffc857,
  amber: 0xff9736,
  fire: 0xf65b3e,
  cyan: 0x51d8ed,
  ice: 0xb1faff,
  violet: 0x6e52b7,
  activated: 0x2ae9c6,
  text: 0xf5f2e9,
  muted: 0x9aafc7,
} as const;

/** Same palette as CSS strings, for Phaser Text objects. */
export const CSS_COLORS = {
  gold: '#FFC857',
  amber: '#FF9736',
  fire: '#F65B3E',
  cyan: '#51D8ED',
  ice: '#B1FAFF',
  activated: '#2AE9C6',
  text: '#F5F2E9',
  muted: '#9AAFC7',
} as const;

/** System fonts only: no third-party font files to license. */
export const FONT_UI = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
export const FONT_MONO = "Consolas, 'Courier New', monospace";

export const SCENE_KEYS = {
  boot: 'BootScene',
  title: 'TitleScene',
  game: 'GameScene',
} as const;
