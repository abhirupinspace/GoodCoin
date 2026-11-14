/**
 * GOODCOIN image registry. Every image on the site is referenced from here, so art can be replaced
 * without touching a layout. `SHOTS` are cinematic crops of an asset: focal x/y in % of the image,
 * `zoom` = how far the camera pushes in. `flame` marks where the fire sits, so the signature
 * treatment can keep the fire in colour while the rest of the image prints in monochrome.
 */
export interface Asset { src: string; width: number; height: number; flame?: { x: number; y: number; rx: number; ry: number } }

export const ASSETS = {
  /** Master artwork: a torch-bearing crowd (transparent PNG). */
  crowd: { src: "/img/crowd.png", width: 2160, height: 1215, flame: { x: 57, y: 13, rx: 17, ry: 17 } },
  /** The gathering: a crowd around the communal fire under flame banners (opaque, already red). */
  hearth: { src: "/img/hero1.png", width: 1920, height: 1080, flame: { x: 60, y: 74, rx: 14, ry: 12 } },
} satisfies Record<string, Asset>;

export type AssetName = keyof typeof ASSETS;

export interface Shot { asset: AssetName; x: number; y: number; zoom: number }

export const SHOTS = {
  /** The whole gathering around the communal fire. */
  assembly: { asset: "hearth", x: 50, y: 50, zoom: 1 },
  /** The communal fire itself: the Hearth. */
  brazier: { asset: "hearth", x: 60, y: 70, zoom: 1.8 },
  /** Everyone. */
  gathering: { asset: "crowd", x: 50, y: 55, zoom: 1 },
  /** The lone torch: the spark. */
  spark: { asset: "crowd", x: 55, y: 22, zoom: 2.4 },
  /** The torch-bearer's face and raised arm. */
  bearer: { asset: "crowd", x: 50, y: 50, zoom: 2.1 },
  /** Faces looking up together. */
  faces: { asset: "crowd", x: 72, y: 74, zoom: 2.2 },
  /** Neighbours: the capped worker and the woman. */
  neighbours: { asset: "crowd", x: 25, y: 76, zoom: 2.3 },
  /** Only the fire. */
  fire: { asset: "crowd", x: 57, y: 13, zoom: 3 },
  /** The crowd's right flank. */
  flank: { asset: "crowd", x: 84, y: 70, zoom: 1.9 },
} satisfies Record<string, Shot>;

export type ShotName = keyof typeof SHOTS;

/** A deterministic shot for an archive entry. */
export function shotForWeek(week: number): ShotName {
  const list: ShotName[] = ["faces", "neighbours", "bearer", "flank", "spark"];
  return list[Math.abs(week) % list.length];
}
