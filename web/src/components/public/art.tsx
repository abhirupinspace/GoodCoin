/**
 * Additional original artwork for the public pages, in the same woodcut / constructivist idiom as
 * components/art: flat ink shapes, paper-colour cut lines, a restricted palette. Decorative only.
 */
import type { SVGProps } from "react";
import { FlameMark } from "@/components/art";

const INK = "#24221e";
const PAPER = "#e8d9b9";
const RED = "#a93428";
const EMBER = "#d66a32";
const BURNT = "#a84b27";
const MUSTARD = "#c29a48";
const FOREST = "#46543d";

type ArtProps = SVGProps<SVGSVGElement>;

/** A folded public-information pamphlet with a flame emblem. */
export function PamphletArt(p: ArtProps) {
  return (
    <svg viewBox="0 0 360 360" aria-hidden {...p}>
      <path d="M40 60 L180 40 L180 330 L40 312 Z" fill={INK} />
      <path d="M180 40 L320 60 L320 312 L180 330 Z" fill={BURNT} />
      <path d="M180 40 L180 330" stroke={PAPER} strokeWidth="3" />
      <g stroke={PAPER} strokeWidth="5" opacity="0.6" strokeLinecap="square">
        <path d="M66 210 L154 202" /><path d="M66 232 L154 224" /><path d="M66 254 L138 248" /><path d="M66 276 L150 270" />
        <path d="M206 202 L294 210" /><path d="M206 224 L294 232" /><path d="M206 246 L280 252" />
      </g>
      <circle cx="110" cy="130" r="46" fill={RED} />
      <g transform="translate(94 104)"><FlameMark width="32" height="44" color={EMBER} inner={MUSTARD} /></g>
      <path d="M210 90 L292 102 L292 176 L210 168 Z" fill={MUSTARD} />
      <path d="M214 160 L236 126 L252 146 L266 118 L288 170" fill="none" stroke={INK} strokeWidth="5" />
    </svg>
  );
}

/** An open ledger with a flame bookmark — the financial publication. */
export function LedgerArt(p: ArtProps) {
  return (
    <svg viewBox="0 0 400 300" aria-hidden {...p}>
      <path d="M20 70 C80 50 150 56 200 84 C250 56 320 50 380 70 L380 270 C320 252 250 256 200 280 C150 256 80 252 20 270 Z" fill={INK} />
      <path d="M36 82 C90 66 150 72 192 96 L192 262 C150 242 90 238 36 252 Z" fill={PAPER} />
      <path d="M208 96 C250 72 310 66 364 82 L364 252 C310 238 250 242 208 262 Z" fill={PAPER} />
      <g stroke={INK} strokeWidth="2" opacity="0.55">
        {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M52 ${112 + i * 20} L176 ${118 + i * 20}`} />)}
        <path d="M140 100 L140 248" />
      </g>
      <g fill={RED}>
        {[60, 82, 104, 126, 148].map((h, i) => <rect key={i} x={226 + i * 26} y={232 - h} width="16" height={h} />)}
      </g>
      <path d="M222 232 L350 232" stroke={INK} strokeWidth="3" />
      <path d="M300 40 L324 40 L324 120 L312 108 L300 120 Z" fill={EMBER} />
    </svg>
  );
}

/** An exhibition wall of framed fire cards with stamps. */
export function ArchiveArt(p: ArtProps) {
  const cards = [
    [20, 30, FOREST], [140, 20, RED], [260, 34, FOREST],
    [40, 160, RED], [160, 150, FOREST], [280, 166, FOREST],
  ] as const;
  return (
    <svg viewBox="0 0 400 300" aria-hidden {...p}>
      {cards.map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${(i % 3) - 1} 50 55)`}>
          <rect x="6" y="6" width="100" height="112" fill={INK} />
          <rect width="100" height="112" fill={PAPER} stroke={INK} strokeWidth="3" />
          <path d="M50 18 C58 34 74 40 74 58 C74 72 64 80 50 80 C36 80 26 72 26 58 C26 48 34 44 36 34 C40 42 44 44 48 46 C46 36 46 26 50 18 Z" fill={c === FOREST ? EMBER : INK} opacity={c === FOREST ? 1 : 0.35} />
          <rect x="16" y="88" width="68" height="14" fill="none" stroke={c} strokeWidth="3" transform="rotate(-4 50 95)" />
        </g>
      ))}
    </svg>
  );
}

/** A padlock whose key has been snapped — no admin keys. */
export function LockArt(p: ArtProps) {
  return (
    <svg viewBox="0 0 360 360" aria-hidden {...p}>
      <circle cx="180" cy="190" r="150" fill={MUSTARD} opacity="0.35" />
      <path d="M110 160 L110 110 C110 66 142 40 180 40 C218 40 250 66 250 110 L250 160 L220 160 L220 112 C220 86 202 70 180 70 C158 70 140 86 140 112 L140 160 Z" fill={INK} />
      <rect x="80" y="160" width="200" height="160" fill={RED} />
      <rect x="80" y="160" width="200" height="160" fill="none" stroke={INK} strokeWidth="6" />
      <g stroke={PAPER} strokeWidth="3" opacity="0.5"><path d="M96 190 L264 190" /><path d="M96 290 L264 290" /></g>
      <circle cx="180" cy="228" r="20" fill={INK} />
      <path d="M170 236 L190 236 L196 276 L164 276 Z" fill={INK} />
      {/* snapped key */}
      <g transform="translate(270 70) rotate(35)">
        <circle cx="0" cy="0" r="22" fill="none" stroke={INK} strokeWidth="10" />
        <rect x="20" y="-5" width="40" height="10" fill={INK} />
      </g>
      <g transform="translate(326 128) rotate(55)"><rect x="0" y="-5" width="30" height="10" fill={INK} /><rect x="18" y="5" width="8" height="12" fill={INK} /></g>
      <path d="M318 98 L336 118" stroke={EMBER} strokeWidth="5" />
    </svg>
  );
}

/** A constructivist loudhailer — questions asked out loud. */
export function MegaphoneArt(p: ArtProps) {
  return (
    <svg viewBox="0 0 400 300" aria-hidden {...p}>
      <path d="M60 130 L200 70 L200 230 L60 170 Z" fill={RED} />
      <rect x="30" y="126" width="34" height="48" fill={INK} />
      <path d="M200 60 L226 60 L226 240 L200 240 Z" fill={INK} />
      <path d="M90 170 L110 250 L136 250 L124 184 Z" fill={INK} />
      <g stroke={PAPER} strokeWidth="3" opacity="0.5"><path d="M96 146 L180 112" /><path d="M96 156 L180 152" /></g>
      <g stroke={EMBER} strokeWidth="9" strokeLinecap="square">
        <path d="M262 100 L330 64" /><path d="M270 150 L360 150" /><path d="M262 200 L330 236" />
      </g>
    </svg>
  );
}

/** A type-case / printing press roller with gears — documentation for builders. */
export function PressArt(p: ArtProps) {
  const gear = (cx: number, cy: number, r: number, fill: string) => (
    <g>
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={cx - 7} y={cy - r - 12} width="14" height="20" fill={fill} transform={`rotate(${i * 36} ${cx} ${cy})`} />
      ))}
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      <circle cx={cx} cy={cy} r={r * 0.35} fill={PAPER} />
    </g>
  );
  return (
    <svg viewBox="0 0 400 300" aria-hidden {...p}>
      {gear(130, 130, 64, INK)}
      {gear(250, 190, 42, BURNT)}
      <rect x="40" y="250" width="320" height="26" fill={INK} />
      <g fill={PAPER} opacity="0.55">{Array.from({ length: 9 }, (_, i) => <rect key={i} x={54 + i * 34} y="257" width="20" height="12" />)}</g>
      <path d="M300 40 L370 40 L370 140 L300 140 Z" fill={MUSTARD} />
      <g stroke={INK} strokeWidth="4"><path d="M312 64 L358 64" /><path d="M312 84 L350 84" /><path d="M312 104 L358 104" /><path d="M312 124 L340 124" /></g>
    </svg>
  );
}

/** Balanced scales with a flame on one pan — terms, kept honest. */
export function ScalesArt(p: ArtProps) {
  return (
    <svg viewBox="0 0 400 300" aria-hidden {...p}>
      <rect x="192" y="40" width="16" height="220" fill={INK} />
      <path d="M140 270 L260 270 L240 250 L160 250 Z" fill={INK} />
      <path d="M70 70 L330 70" stroke={INK} strokeWidth="10" />
      <circle cx="200" cy="60" r="16" fill={RED} />
      <g stroke={INK} strokeWidth="3"><path d="M80 70 L50 170" /><path d="M80 70 L110 170" /><path d="M320 70 L290 170" /><path d="M320 70 L350 170" /></g>
      <path d="M36 170 L124 170 C120 196 100 206 80 206 C60 206 40 196 36 170 Z" fill={BURNT} />
      <path d="M276 170 L364 170 C360 196 340 206 320 206 C300 206 280 196 276 170 Z" fill={BURNT} />
      <g transform="translate(64 116)"><FlameMark width="32" height="44" color={EMBER} inner={MUSTARD} /></g>
      <g stroke={PAPER} strokeWidth="5"><path d="M296 150 L344 150" /><path d="M296 162 L336 162" /></g>
      <rect x="290" y="136" width="60" height="34" fill="none" stroke={INK} strokeWidth="3" />
    </svg>
  );
}

/** Many small hands raised to one flame — collective action. */
export function RaisedHandsArt(p: ArtProps) {
  return (
    <svg viewBox="0 0 400 320" aria-hidden {...p}>
      <circle cx="200" cy="120" r="96" fill={RED} opacity="0.85" />
      <g transform="translate(176 66)"><FlameMark width="48" height="64" color={EMBER} inner={MUSTARD} /></g>
      {Array.from({ length: 9 }, (_, i) => {
        const x = 30 + i * 42;
        const h = 120 + ((i * 29) % 50);
        const lean = (i - 4) * 4;
        return (
          <g key={i} transform={`translate(${x} 320) rotate(${lean})`}>
            <rect x="-9" y={-h} width="18" height={h} fill={i % 2 ? BURNT : INK} />
            <path d={`M-14 ${-h} L-14 ${-h - 28} L14 ${-h - 28} L14 ${-h} Z`} fill={i % 2 ? BURNT : INK} />
            {[-10, -3, 4, 11].map((fx) => <rect key={fx} x={fx - 2} y={-h - 44} width="5" height="18" fill={i % 2 ? BURNT : INK} />)}
          </g>
        );
      })}
    </svg>
  );
}
