"use client";

import { Loadable } from "@/components/Loadable";
import { Account, Card, Empty, Notice, PageHeader, Skeleton } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { useAccounts, useChallenges } from "@/lib/queries";
import type { AccountRow } from "@/lib/types";

const TOP = 10;

export function Leaderboard() {
  const accounts = useAccounts();
  const challenges = useChallenges();
  return (
    <>
      <PageHeader title="Leaderboard">Recognition for contributing, verifying and showing up. Counts come from per-account contract stats.</PageHeader>
      <Notice>Never ranked by token balance: holding GOOD is not a contribution.</Notice>
      <Loadable query={accounts} skeleton={<Skeleton className="mt-4 h-64" />}>
        {(rows) => (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Ranking title="Most approved deeds" rows={rows} metric={(s) => s.approved} unit="approved" />
            <Ranking title="Most attestations" rows={rows} metric={(s) => s.attestations} unit="attestations" />
            <Ranking title="Longest participation" rows={rows} metric={(s) => s.epochs.length} unit="epochs" />
          </div>
        )}
      </Loadable>
      <div className="mt-4">
        <Card title="Community impact by category">
          <Loadable query={challenges}>
            {(list) => {
              const byCat = new Map<string, { challenges: number; submissions: number; approved: number }>();
              for (const { challenge: c } of list) {
                if (c.state === "Draft") continue;
                const cur = byCat.get(c.input.category) ?? { challenges: 0, submissions: 0, approved: 0 };
                byCat.set(c.input.category, { challenges: cur.challenges + 1, submissions: cur.submissions + c.submissions, approved: cur.approved + c.approved });
              }
              const cats = [...byCat.entries()].sort((a, b) => b[1].approved - a[1].approved);
              if (cats.length === 0) return <Empty>No published challenges yet.</Empty>;
              return (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-fg">
                    <tr>
                      <th className="pb-1 font-medium">Category</th>
                      <th className="pb-1 text-right font-medium">Challenges</th>
                      <th className="pb-1 text-right font-medium">Submissions</th>
                      <th className="pb-1 text-right font-medium">Approved deeds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cats.map(([cat, v]) => (
                      <tr key={cat} className="border-t border-border">
                        <td className="py-1.5">{cat}</td>
                        <td className="py-1.5 text-right font-mono tabular-nums">{formatInt(v.challenges)}</td>
                        <td className="py-1.5 text-right font-mono tabular-nums">{formatInt(v.submissions)}</td>
                        <td className="py-1.5 text-right font-mono tabular-nums">{formatInt(v.approved)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            }}
          </Loadable>
        </Card>
      </div>
    </>
  );
}

function Ranking({ title, rows, metric, unit }: { title: string; rows: AccountRow[]; metric: (s: AccountRow[1]) => number; unit: string }) {
  const ranked = rows
    .map(([id, s]) => ({ id, value: metric(s) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.id.localeCompare(b.id))
    .slice(0, TOP);
  return (
    <Card title={title}>
      {ranked.length === 0 ? (
        <Empty>Nobody yet.</Empty>
      ) : (
        <ol className="space-y-1.5 text-sm">
          {ranked.map((r, i) => (
            <li key={r.id} className="flex items-baseline gap-2">
              <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-fg tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <Account id={r.id} max={26} />
              </span>
              <span className="font-mono tabular-nums">
                {formatInt(r.value)} <span className="sr-only">{unit}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
