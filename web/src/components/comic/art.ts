/**
 * The GOODCOIN art library. Every illustration on the site comes from one master artwork so the whole
 * site reads as one illustrated book. Scenes are cinematic crops of the master: `x`/`y` are the focal
 * point in percent of the image, `zoom` is how far the "camera" pushes in.
 * To add new artwork, drop the file in /public and register it here.
 */
export const MASTER = { src: "/art1hero.png", width: 2160, height: 1215 } as const;

export interface Shot { x: number; y: number; zoom: number }

export const SHOTS = {
  /** The lone torch-bearer: one person, one flame. */
  oneSpark: { x: 47, y: 34, zoom: 2.3 },
  /** The torch-bearer and the woman beside them: someone joins. */
  twoJoin: { x: 44, y: 62, zoom: 1.55 },
  /** The whole collective. */
  collective: { x: 50, y: 60, zoom: 1 },
  /** Only the flame. */
  flame: { x: 58, y: 16, zoom: 2.6 },
  /** Faces looking up together. */
  faces: { x: 74, y: 76, zoom: 2.1 },
  /** The capped worker and the woman: neighbours. */
  neighbours: { x: 26, y: 78, zoom: 2.2 },
  /** The raised arm and torch. */
  torch: { x: 46, y: 40, zoom: 2.9 },
} satisfies Record<string, Shot>;

export type ShotName = keyof typeof SHOTS;

/** A deterministic shot for an archive card, so every fire gets its own "panel". */
export function shotForWeek(week: number): Shot {
  const list = Object.values(SHOTS).filter((s) => s.zoom > 1);
  return list[week % list.length];
}
