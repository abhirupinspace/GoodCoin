// Print-styled pure-SVG charts. Values are plotted as numbers but every label is formatted by the caller
// from exact BigInt data; a collapsible table always shows the underlying figures.
import type { ReactNode } from "react";

const INK = "#24221e";
const EMBER = "#d66a32";
const RED = "#a93428";
const FOREST = "#46543d";
const W = 1000;
const H = 300;
const PAD = { l: 40, r: 40, t: 16, b: 34 };

export interface Point { x: string; y: number; tone?: "ember" | "red" | "forest" | "ink"; label: string }
const TONE = { ember: EMBER, red: RED, forest: FOREST, ink: INK };

function Frame({ title, summary, children, table, legend }: { title: string; summary: string; children: ReactNode; table: ReactNode; legend?: ReactNode }) {
  const hatch = `hatch-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${summary}`} className="h-auto w-full border-2 border-ink bg-paper">
        <defs>
          <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth="1" opacity="0.15" />
          </pattern>
        </defs>
        <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} fill={`url(#${hatch})`} />
        {children}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-ink/70">
        <span>{summary}</span>
        {legend}
      </figcaption>
      <details className="mt-2 text-sm">
        <summary className="eyebrow cursor-pointer text-ink/60 hover:text-ink">Show the numbers</summary>
        <div className="mt-2 max-h-64 overflow-auto border-2 border-ink/20">{table}</div>
      </details>
    </figure>
  );
}

function Table({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <table className="w-full text-left">
      <thead className="bg-parchment"><tr><th className="px-3 py-1.5">{head[0]}</th><th className="px-3 py-1.5 text-right">{head[1]}</th></tr></thead>
      <tbody className="num">
        {rows.map(([a, b], i) => <tr key={i} className="border-t border-ink/10"><td className="px-3 py-1">{a}</td><td className="px-3 py-1 text-right">{b}</td></tr>)}
      </tbody>
    </table>
  );
}

/** Bar chart from zero. Bars keep their caller-given tone. */
export function BarChart({ title, summary, points, xHead, yHead, legend }: { title: string; summary: string; points: Point[]; xHead: string; yHead: string; legend?: ReactNode }) {
  const max = Math.max(...points.map((p) => p.y), 0) || 1;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const step = iw / Math.max(points.length, 1);
  const bw = Math.max(1, Math.min(28, step * 0.7));
  const every = Math.ceil(points.length / 10);
  return (
    <Frame title={title} summary={summary} legend={legend} table={<Table head={[xHead, yHead]} rows={points.map((p) => [p.x, p.label])} />}>
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke={INK} strokeWidth="2" />
      {points.map((p, i) => {
        const h = (p.y / max) * ih;
        const x = PAD.l + i * step + (step - bw) / 2;
        return (
          <g key={i}>
            <rect x={x} y={H - PAD.b - h} width={bw} height={h} fill={TONE[p.tone ?? "ember"]} stroke={INK} strokeWidth={bw > 4 ? 1.5 : 0} />
            {i % every === 0 && <text x={x + bw / 2} y={H - PAD.b + 20} textAnchor="middle" fontSize="13" fill={INK} fontFamily="var(--font-archivo), sans-serif">{p.x}</text>}
          </g>
        );
      })}
    </Frame>
  );
}

/** Step line (value holds until the next point). y-range is [min, max] of the data and is printed on the chart. */
export function StepChart({ title, summary, points, xHead, yHead, yMinLabel, yMaxLabel }: {
  title: string; summary: string; points: Point[]; xHead: string; yHead: string; yMinLabel: string; yMaxLabel: string;
}) {
  const ys = points.map((p) => p.y);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const span = hi - lo || 1;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b - 20;
  const X = (i: number) => PAD.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const Y = (y: number) => PAD.t + 20 + (1 - (y - lo) / span) * ih;
  let d = "";
  points.forEach((p, i) => { d += i === 0 ? `M${X(i)} ${Y(p.y)}` : ` H${X(i)} V${Y(p.y)}`; });
  const every = Math.ceil(points.length / 10);
  return (
    <Frame title={title} summary={summary} table={<Table head={[xHead, yHead]} rows={points.map((p) => [p.x, p.label])} />}>
      <text x={PAD.l + 6} y={PAD.t + 14} fontSize="12" fill={INK} opacity="0.7" fontFamily="var(--font-archivo), sans-serif">top {yMaxLabel} · bottom {yMinLabel}</text>
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke={INK} strokeWidth="2" />
      <path d={d} fill="none" stroke={RED} strokeWidth="3" strokeLinejoin="miter" />
      {points.map((p, i) => (
        <g key={i}>
          {p.tone && <rect x={X(i) - 4} y={Y(p.y) - 4} width="8" height="8" fill={TONE[p.tone]} stroke={INK} />}
          {i % every === 0 && <text x={X(i)} y={H - PAD.b + 20} textAnchor="middle" fontSize="13" fill={INK} fontFamily="var(--font-archivo), sans-serif">{p.x}</text>}
        </g>
      ))}
    </Frame>
  );
}
