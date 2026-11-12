/**
 * Original GOODCOIN artwork, drawn as SVG in a woodcut / constructivist poster idiom:
 * flat ink shapes, paper-colour "cut" lines, dramatic diagonals, a restricted palette.
 * Decorative only — every piece is aria-hidden; all meaningful text lives in HTML.
 */
import type { SVGProps } from "react";

const INK = "#24221e";
const PAPER = "#e8d9b9";
const RED = "#a93428";
const EMBER = "#d66a32";
const BURNT = "#a84b27";
const MUSTARD = "#c29a48";
const FOREST = "#46543d";

type ArtProps = SVGProps<SVGSVGElement> & { title?: never };

/** Rays fanning from a point — the constructivist sunburst behind the fire. */
export function Sunburst({ rays = 28, color = RED, opacity = 0.9, ...p }: ArtProps & { rays?: number; color?: string; opacity?: number }) {
  const wedges = Array.from({ length: rays }, (_, i) => {
    const a0 = Math.PI + (i * Math.PI) / rays;
    const a1 = a0 + Math.PI / rays / 2;
    const r = 1400;
    return `M600 700 L${600 + r * Math.cos(a0)} ${700 + r * Math.sin(a0)} L${600 + r * Math.cos(a1)} ${700 + r * Math.sin(a1)} Z`;
  });
  return (
    <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMax slice" aria-hidden {...p}>
      <g fill={color} opacity={opacity}>
        {wedges.map((d, i) => <path key={i} d={d} />)}
      </g>
    </svg>
  );
}

/** The monumental fire: three layered tongues with woodcut cut-lines. */
export function MonumentalFlame({ animated = true, ...p }: ArtProps & { animated?: boolean }) {
  return (
    <svg viewBox="0 0 400 560" aria-hidden {...p}>
      <g className={animated ? "origin-bottom animate-flicker" : undefined} style={{ transformBox: "fill-box" }}>
        <path d="M200 12 C228 96 330 150 346 292 C362 440 284 540 200 548 C116 540 38 440 54 292 C64 196 132 170 150 92 C168 150 176 176 196 196 C190 132 186 72 200 12 Z" fill={RED} />
        <path d="M206 120 C226 184 300 230 302 330 C304 436 254 506 200 510 C146 506 96 436 98 340 C100 268 146 246 160 200 C172 238 184 254 202 262 C194 214 192 164 206 120 Z" fill={EMBER} />
        <path d="M200 286 C214 326 262 352 258 412 C254 470 226 494 200 496 C174 494 146 470 142 418 C140 378 170 362 176 330 C184 352 190 362 200 366 C196 340 194 310 200 286 Z" fill={MUSTARD} />
        {/* woodcut cut-lines */}
        <g stroke={PAPER} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55">
          <path d="M120 300 C110 360 124 420 160 470" />
          <path d="M284 300 C294 360 280 420 244 470" />
          <path d="M150 230 C140 270 138 300 146 330" />
          <path d="M254 236 C266 272 266 304 258 334" />
          <path d="M200 420 C196 448 198 470 204 488" />
        </g>
      </g>
    </svg>
  );
}

/** A small flame mark for the logo and icons. */
export function FlameMark({ color = EMBER, inner = MUSTARD, ...p }: ArtProps & { color?: string; inner?: string }) {
  return (
    <svg viewBox="0 0 32 40" aria-hidden {...p}>
      <path d="M16 1 C19 9 28 13 29 24 C30 33 24 39 16 39 C8 39 2 33 3 24 C4 17 10 15 11 8 C12 13 13 15 15 16 C14 11 14 6 16 1 Z" fill={color} />
      <path d="M16 20 C17 24 21 26 21 30 C21 34 19 36 16 36 C13 36 11 34 11 30 C11 27 13 26 14 23 C15 25 15 25 16 26 C15 24 15 22 16 20 Z" fill={inner} />
    </svg>
  );
}

/** One raised-arm figure (constructivist silhouette). `torch` adds a flame. */
function Figure({ x, s = 1, torch = false, lean = 0, fill = INK }: { x: number; s?: number; torch?: boolean; lean?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} 0) scale(${s}) skewX(${lean})`}>
      <circle cx="0" cy="-118" r="13" fill={fill} />
      <path d="M-20 -100 L20 -100 L26 -40 L18 0 L6 0 L0 -36 L-6 0 L-18 0 L-26 -40 Z" fill={fill} />
      {/* raised arm */}
      <path d="M12 -96 L34 -150 L44 -146 L24 -90 Z" fill={fill} />
      <path d="M-14 -96 L-30 -60 L-22 -56 L-6 -90 Z" fill={fill} />
      {torch && (
        <g transform="translate(42 -150)">
          <rect x="-3" y="-4" width="6" height="22" fill={BURNT} transform="rotate(20)" />
          <path d="M0 -30 C5 -20 12 -16 12 -8 C12 0 6 4 0 4 C-6 4 -12 0 -12 -8 C-12 -14 -6 -16 -4 -22 C-3 -18 -2 -16 0 -15 C-1 -20 -1 -25 0 -30 Z" fill={EMBER} />
        </g>
      )}
    </g>
  );
}

/** A marching crowd: varied silhouettes, some carrying torches. */
export function Crowd({ count = 14, fill = INK, ...p }: ArtProps & { count?: number; fill?: string }) {
  const people = Array.from({ length: count }, (_, i) => {
    const x = 40 + (i * 1120) / (count - 1);
    const s = 0.85 + ((i * 37) % 9) / 30;
    return <Figure key={i} x={x} s={s} torch={i % 3 === 1} lean={((i * 13) % 7) - 3} fill={fill} />;
  });
  return (
    <svg viewBox="0 -190 1200 200" preserveAspectRatio="xMidYMax meet" aria-hidden {...p}>
      {people}
      <rect x="0" y="0" width="1200" height="12" fill={fill} />
    </svg>
  );
}

/** Two hands passing a single ember — "bring a friend". */
export function HandsEmber(p: ArtProps) {
  return (
    <svg viewBox="0 0 400 260" aria-hidden {...p}>
      <circle cx="200" cy="120" r="90" fill={MUSTARD} opacity="0.35" />
      {/* left hand */}
      <path d="M0 170 L120 150 C140 146 160 140 176 132 L186 150 C170 162 150 174 128 180 L0 214 Z" fill={INK} />
      <path d="M150 140 L178 116 C184 112 192 114 190 122 L170 146 Z" fill={INK} />
      {/* right hand */}
      <path d="M400 104 L282 116 C262 118 242 124 226 130 L222 112 C236 104 256 96 278 92 L400 70 Z" fill={BURNT} />
      <path d="M248 122 L222 146 C216 152 208 150 210 142 L230 118 Z" fill={BURNT} />
      {/* ember */}
      <circle cx="202" cy="128" r="22" fill={EMBER} />
      <circle cx="202" cy="128" r="11" fill={MUSTARD} />
      <g stroke={RED} strokeWidth="4" strokeLinecap="round">
        <path d="M202 86 L202 66" /><path d="M234 100 L248 86" /><path d="M170 100 L156 86" />
      </g>
    </svg>
  );
}

/** The Hearth: a stone arch holding a banked fire, with a reserve of embers below. */
export function HearthArt(p: ArtProps) {
  return (
    <svg viewBox="0 0 420 380" aria-hidden {...p}>
      <path d="M30 370 L30 170 C30 74 110 20 210 20 C310 20 390 74 390 170 L390 370 Z" fill={INK} />
      {/* stones */}
      <g fill="none" stroke={PAPER} strokeWidth="3" opacity="0.35">
        <path d="M30 170 L390 170" /><path d="M30 250 L390 250" /><path d="M30 320 L390 320" />
        <path d="M110 170 L110 250" /><path d="M210 170 L210 250" /><path d="M310 170 L310 250" />
        <path d="M70 250 L70 320" /><path d="M160 250 L160 320" /><path d="M260 250 L260 320" /><path d="M350 250 L350 320" />
      </g>
      <path d="M100 370 L100 210 C100 150 150 110 210 110 C270 110 320 150 320 210 L320 370 Z" fill={BURNT} />
      <g className="origin-bottom animate-flicker" style={{ transformBox: "fill-box" }}>
        <path d="M210 160 C228 200 272 218 270 268 C268 316 240 338 210 340 C180 338 152 316 150 270 C150 236 178 222 186 196 C192 214 198 222 208 226 C204 206 204 182 210 160 Z" fill={EMBER} />
        <path d="M210 250 C218 268 238 278 236 302 C234 324 222 332 210 332 C198 332 186 324 184 304 C184 288 196 282 198 270 C202 278 204 282 210 284 C208 274 208 262 210 250 Z" fill={MUSTARD} />
      </g>
      <rect x="100" y="340" width="220" height="30" fill={RED} />
      <g fill={MUSTARD}>
        {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={122 + i * 22} cy={355} r="6" />)}
      </g>
    </svg>
  );
}

/** Kindle: a hand dropping a stick into a small struggling flame. */
export function KindleArt(p: ArtProps) {
  return (
    <svg viewBox="0 0 400 300" aria-hidden {...p}>
      <path d="M250 0 L400 0 L400 70 L300 86 C286 88 274 94 264 102 L240 84 Z" fill={INK} />
      <rect x="196" y="78" width="16" height="96" fill={BURNT} transform="rotate(-32 204 126)" />
      <path d="M200 290 C150 288 120 262 122 226 C124 196 150 186 156 162 C164 182 170 190 184 194 C180 176 182 158 194 142 C206 172 252 186 252 234 C252 270 232 290 200 290 Z" fill={RED} />
      <path d="M196 288 C176 286 164 274 166 256 C168 242 180 238 182 226 C188 236 192 240 198 242 C198 234 198 226 202 218 C210 234 228 244 226 262 C224 280 214 288 196 288 Z" fill={EMBER} />
      <g stroke={MUSTARD} strokeWidth="4" strokeLinecap="round" opacity="0.9">
        <path d="M150 140 L138 120" /><path d="M262 150 L278 132" /><path d="M206 110 L208 92" />
      </g>
    </svg>
  );
}

/** Round seal with an inscription ring (decorative; the same words appear in HTML nearby). */
export function Seal({ text = "MAKE GOOD CONTAGIOUS · ONE FIRE EVERY WEEK · ", color = RED, ...p }: ArtProps & { text?: string; color?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden {...p}>
      <defs>
        <path id="seal-ring" d="M100 100 m-74 0 a74 74 0 1 1 148 0 a74 74 0 1 1 -148 0" />
      </defs>
      <circle cx="100" cy="100" r="96" fill="none" stroke={color} strokeWidth="4" />
      <circle cx="100" cy="100" r="58" fill="none" stroke={color} strokeWidth="2" />
      <text fill={color} fontFamily="var(--font-bebas), sans-serif" fontSize="19" letterSpacing="3">
        <textPath href="#seal-ring">{text}</textPath>
      </text>
      <g transform="translate(84 76) scale(1)">
        <FlameMark color={color} inner={color === RED ? MUSTARD : PAPER} width="32" height="40" />
      </g>
    </svg>
  );
}

/** Slow rising embers (very light; respects reduced motion via globals.css). */
export function Embers({ count = 14 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="absolute bottom-0 block size-1.5 rounded-full bg-ember animate-rise"
          style={{ left: `${(i * 61) % 100}%`, animationDelay: `${(i * 0.73) % 9}s`, opacity: 0 }}
        />
      ))}
    </div>
  );
}

/** Ornamental rule: diamond ends and a centre flame. */
export function Ornament({ color = INK, ...p }: ArtProps & { color?: string }) {
  return (
    <svg viewBox="0 0 400 24" aria-hidden {...p}>
      <path d="M0 12 L170 12" stroke={color} strokeWidth="2" /><path d="M230 12 L400 12" stroke={color} strokeWidth="2" />
      <path d="M170 12 l6 -6 l6 6 l-6 6 Z M218 12 l6 -6 l6 6 l-6 6 Z" fill={color} />
      <g transform="translate(190 0) scale(0.6)"><FlameMark color={EMBER} inner={MUSTARD} width="32" height="40" /></g>
    </svg>
  );
}

/** Field of grain / wheat-like strokes for "community" sections. */
export function FieldLines({ color = FOREST, ...p }: ArtProps & { color?: string }) {
  return (
    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden {...p}>
      <g stroke={color} strokeWidth="3" opacity="0.7">
        {Array.from({ length: 80 }, (_, i) => (
          <path key={i} d={`M${i * 15} 120 L${i * 15 + 18} ${40 + ((i * 17) % 30)}`} />
        ))}
      </g>
    </svg>
  );
}
