import { Hero } from "@/components/brand";
import type { Metadata } from "next";
import { Button, Notice } from "@/components/ui";
import { Callout, Chapter, Code, EndBand } from "@/components/public/Page";
import { AccessKeys, InvariantsLive } from "@/components/public/ref-SecurityLive";
import { REPO } from "@/lib/config";

export const metadata: Metadata = {
  title: "Security",
  description: "No admin, live on-chain invariants, testing evidence and the honest limits of GOODCOIN. Testnet, not audited.",
};

const NO_ADMIN = [
  ["No owner", "There is no owner account and no role that can do more than anyone else."],
  ["No setters", "Every parameter is fixed at deploy. Nothing can change the goal rule, the fee, or the causes."],
  ["No upgrade", "There is no upgrade method, and with no access keys the code can't be redeployed."],
  ["No pause", "Nobody can stop giving, claiming or redeeming."],
];

const ATTACKS: [string, string, string][] = [
  ["Redeem between settlement and claim to push the floor down", "GOOD for givers is counted in the backed supply the moment a fire settles, so claims never change the floor.", "None"],
  ["All GOOD redeemed, floor resets", "A locked seed (1 NEAR and 1,000,000 GOOD nobody owns) keeps the backed supply above zero forever.", "None"],
  ["First-depositor inflation of the Hearth", "There are no direct deposits: the Hearth grows only through fees of fires that catch.", "None"],
  ["Paying a cause twice", "Payouts move Due → Sending → Paid or Carried. A payout acts only on Due.", "None"],
  ["Fake givers to reach a goal", "Each counted giver costs a minimum gift plus the record fee, and 90% of it reaches the cause.", "Accounts are not people"],
  ["Give, then withdraw at the last second", "Gifts can't be withdrawn before settlement.", "None"],
  ["Buying a catch by kindling", "Only in the last 10% of the week, only a few givers short, at a doubling cost; a rescued fire never raises the goal.", "Holders can subsidise a few givers each week"],
  ["Re-registering a dead cause's name", "A failed payout marks the cause dead forever; causes must be named accounts.", "Re-registration before any payout fails is not caught"],
  ["Self-referral and account splitting", "The spark bounty moves weight from the newcomer to the spark. Total weight is unchanged, so fake friends earn nothing.", "The referral count can be padded; no GOOD is gained"],
  ["Colluding cause fakes a catch", "New GOOD always costs at least 1.25× the floor, so recycled gifts buy nothing cheap. Causes rotate in a fixed order.", "Not eliminated"],
];

const LIMITS = [
  ["A colluding cause can fake a catch.", "Its insiders give and get the 90% back off-chain. For a small holder that costs about 2% of the gifts and buys a fake streak, never GOOD below 1.25× the floor. Mitigated by curated DAO causes, fixed rotation and public flows. Not eliminated."],
  ["Accounts are not people.", "Giver counts can be faked at a minimum gift plus the record fee per fake giver. Without collusion, 90% of that still reaches the cause."],
  ["Giving is giving.", "At the floor, a giver's GOOD is worth about 8–9% of the gift on day one. It grows with every later fire that catches. It is not a return on the gift."],
  ["A smother destroys GOOD that was never minted.", "It lowers the maximum supply, not circulating supply. Weeks with no gifts also smother, so an idle protocol slowly lowers its own cap and goal."],
  ["The chain verifies a transfer, not the good done.", "The contract proves NEAR reached a curated account. What it funded is the cause's own report. A cause account deleted and re-registered by someone else before any payout fails would receive payouts."],
  ["Testnet causes and early givers are placeholders.", "They are team-controlled and labelled as demo."],
  ["Holders can subsidise catches.", "By kindling, holders can cover up to a quarter of the base goal (at least 1, at most 17) givers a week, at a doubling cost in burned GOOD. Rescued catches never raise the goal."],
];

export default function SecurityPage() {
  return (
    <>
      <Hero
        variant="minimal"
        marker={<>Technical archive <span className="text-red">/</span> Security</>}
        lines={["Trust the mechanism.", <span key="b" className="text-red">Verify the rules.</span>]}
        h1Class="display text-[clamp(3.4rem,8vw,8rem)]"
        lede="Rules fixed at deploy. No keys. The chain checks the money after every step."
        meta={[["Admin methods", "None"], ["Owner", "None"], ["Audit", "Not audited"], ["Network", "Testnet"]]}
      />

      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <Notice title="Not audited · testnet only">GOODCOIN runs on NEAR testnet. The contract has not been audited. Testnet NEAR has no value; do not treat anything here as safe for real funds.</Notice>
      </div>

      <Chapter no="01" kicker="No admin" title="Nobody holds the keys." aside={<AccessKeys />}>
        <p>After the contract was initialised, every access key on its account was deleted. With zero keys, no one can deploy new code, call a privileged method or move the Hearth.</p>
        <ul className="grid gap-3 pt-2 font-sans sm:grid-cols-2">
          {NO_ADMIN.map(([t, b]) => (
            <li key={t} className="border-2 border-line p-4"><p className="display text-2xl">{t}</p><p className="mt-1 text-sm text-ink/75">{b}</p></li>
          ))}
        </ul>
      </Chapter>

      <Chapter no="02" kicker="Live invariants" title="The chain checks the money." tone="parchment">
        <p>The contract exposes <Code>check_invariants()</Code>. Every test asserts these after every step; here they are read live from testnet, refreshed every few seconds.</p>
        <div className="pt-2 font-sans"><InvariantsLive /></div>
        <p className="font-sans text-sm text-ink/70">&ldquo;The floor never decreased&rdquo; is checkable because the contract stores the highest floor ever reached as a pair (Hearth, backed GOOD) and compares exactly, without rounding.</p>
      </Chapter>

      <Chapter no="03" kicker="Testing evidence" title="Tested three ways.">
        <ol className="grid gap-4 pt-2 font-sans md:grid-cols-3">
          <li className="frame bg-paper p-5">
            <p className="display text-6xl text-ember">46</p>
            <p className="display mt-1 text-2xl">Contract tests</p>
            <p className="mt-2 text-sm text-ink/75">Every rule and every error code, plus a property test that runs random histories of gifts, settlements, claims, kindles and redemptions and asserts the invariants after each step. Run with <Code>cargo test</Code>.</p>
          </li>
          <li className="frame bg-paper p-5">
            <p className="display text-6xl text-ember">1</p>
            <p className="display mt-1 text-2xl">Golden trace, three languages</p>
            <p className="mt-2 text-sm text-ink/75">One scenario file produces identical numbers in the Rust contract, the exact-integer Python model (<Code>uv run pytest</Code>) and this website&apos;s math.</p>
          </li>
          <li className="frame bg-paper p-5">
            <p className="display text-6xl text-ember">E2E</p>
            <p className="display mt-1 text-2xl">Live on testnet</p>
            <p className="mt-2 text-sm text-ink/75">A scripted run on the locked demo contract: a catch with a spark, a deleted cause carried, a smother, a kindle rescue, a redeem. Every step asserted chain state; it passed with all invariants true and 0 keys.</p>
          </li>
        </ol>
        <p className="font-sans text-sm"><a className="underline underline-offset-2 hover:text-burnt" href={`${REPO}/tree/main/contract`} target="_blank" rel="noreferrer">Contract source ↗</a> · <a className="underline underline-offset-2 hover:text-burnt" href={`${REPO}/blob/main/tests/golden/basic.json`} target="_blank" rel="noreferrer">Golden trace ↗</a> · <a className="underline underline-offset-2 hover:text-burnt" href={`${REPO}/tree/main/deploy`} target="_blank" rel="noreferrer">E2E script ↗</a></p>
      </Chapter>

      <Chapter no="04" kicker="Threat model" title="Attacks, and what stops them." tone="dark">
        <p>A selection from the full threat model. Every design from the third version on went through independent adversarial review.</p>
        <div className="overflow-x-auto pt-2">
          <table className="w-full min-w-[640px] border-collapse text-left font-sans text-sm">
            <thead><tr className="border-b-2 border-line">{["Attack", "Defence", "What remains"].map((h) => <th key={h} scope="col" className="eyebrow px-3 py-3 text-mustard">{h}</th>)}</tr></thead>
            <tbody>
              {ATTACKS.map(([a, d, r]) => (
                <tr key={a} className="border-b border-line align-top">
                  <th scope="row" className="px-3 py-3 font-semibold text-ink">{a}</th>
                  <td className="px-3 py-3 text-ink/80">{d}</td>
                  <td className={`px-3 py-3 ${r === "None" ? "text-ink/60" : "text-ember"}`}>{r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Chapter>

      <Chapter id="limits" no="05" kicker="Honest limits" title="What we can't promise.">
        <ol className="space-y-4 pt-2">
          {LIMITS.map(([t, b], i) => (
            <li key={t} className="grid grid-cols-[auto_1fr] gap-4 border-b border-line pb-4">
              <span className="display text-4xl text-ember">{String(i + 1).padStart(2, "0")}</span>
              <div><p className="font-sans font-bold">{t}</p><p className="mt-1">{b}</p></div>
            </li>
          ))}
        </ol>
        <Callout>The backing floor is denominated in NEAR. It is not a guaranteed market price or USD value.</Callout>
      </Chapter>

      <EndBand title="Check it yourself." body="Every claim on this page can be verified with a read-only command.">
        <Button href="/docs#verify" size="lg">Verify on-chain</Button>
        <Button href="/faq" size="lg" tone="outline">Read the FAQ</Button>
      </EndBand>
    </>
  );
}
