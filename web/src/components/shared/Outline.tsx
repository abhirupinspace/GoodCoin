// Placeholder renderer used until designs land: every page declares its purpose, sections and the
// exact contract view / event each section reads, so the data contract is fixed before the visuals.
export interface OutlineSection {
  title: string;
  notes?: string;
  /** Contract views (services/contract.ts) or events (services/events.ts) this section reads. */
  data?: string[];
}

export function Outline({ title, purpose, wallet, sections }: {
  title: string;
  purpose: string;
  wallet?: "none" | "view-without" | "required";
  sections: OutlineSection[];
}) {
  return (
    <main className="outline">
      <h1>{title}</h1>
      <p className="purpose">{purpose}</p>
      {wallet && <p className="wallet">Wallet: {wallet}</p>}
      <ol>
        {sections.map((s) => (
          <li key={s.title}>
            <strong>{s.title}</strong>
            {s.notes && <p>{s.notes}</p>}
            {s.data && <code>{s.data.join(" · ")}</code>}
          </li>
        ))}
      </ol>
    </main>
  );
}
