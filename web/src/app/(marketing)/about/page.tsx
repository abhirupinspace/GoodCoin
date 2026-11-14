import type { Metadata } from "next";
import { Crowd, FieldLines, MonumentalFlame, Ornament } from "@/components/art";
import { EndBand } from "@/components/public/Page";
import { RaisedHandsArt } from "@/components/public/art";
import { Button, Stamp } from "@/components/ui";

export const metadata: Metadata = {
  title: "About",
  description: "The internet has mastered attention. We want to coordinate action. Why GOODCOIN exists, and the principles it is built on.",
};

const PRINCIPLES = [
  { no: "I", title: "Fair launch", body: "No premine, no team allocation, no vesting. Every GOOD in existence was made by people giving together. The only thing present at launch is a locked seed that nobody owns and nobody can move." },
  { no: "II", title: "No admin", body: "No owner, no setters, no pause, no upgrade method. Every key on the contract account was deleted after launch. The rules you read today are the rules for as long as the contract exists." },
  { no: "III", title: "The chain checks the money", body: "No judges, no oracles, no committee deciding what counts. The contract holds the gifts, counts the givers, pays the cause and backs the token. This website only reads what the contract reports." },
  { no: "IV", title: "Honest limits", body: "Accounts are not people. A colluding cause can fake a catch. The chain proves NEAR reached a curated account, not the good that was done. Your GOOD is worth a small fraction of your gift. We say so, everywhere." },
  { no: "V", title: "Contagion over hype", body: "The only way the movement grows is if each week a few more people show up than last time. The goal ratchets up after every catch. Bringing a friend is the one reward we built in, and fake friends earn nothing." },
];

export default function About() {
  return (
    <>
      {/* MANIFESTO HERO */}
      <section className="paper-dark relative overflow-hidden border-b-[3px] border-ink">
        <div className="rays absolute inset-0 opacity-40" aria-hidden />
        <FieldLines className="absolute bottom-0 h-24 w-full" color="#46543d" />
        <div className="relative mx-auto max-w-6xl px-4 pb-32 pt-16 sm:px-6 md:pt-24">
          <p className="lettering text-lg text-mustard">Prologue · A statement of intent</p>
          <h1 className="display misprint-paper mt-5 text-[clamp(3.2rem,9vw,8rem)] text-paper">
            The internet has mastered attention. <span className="text-ember">We want to coordinate action.</span>
          </h1>
          <div className="mt-10 flex flex-wrap gap-3"><Stamp tone="ember">One fire every week</Stamp><Stamp tone="ember">On NEAR</Stamp></div>
        </div>
      </section>

      {/* EDITORIAL */}
      <article className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_0.75fr]">
          <div className="font-serif text-xl leading-relaxed text-ink/85">
            <p className="eyebrow mb-6 font-sans text-burnt">01 Why GOODCOIN exists</p>
            <p className="first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-8xl first-letter:leading-[0.8] first-letter:text-red">
              A joke can get a million people to move in a week. What they move to do, almost always, is buy, hold and hope. The meme does nothing. It is a spectacular piece of coordination pointed at nothing at all.
            </p>
            <p className="mt-6">Giving is the opposite. It is useful, and it is quiet, and it is lonely. People hold back not because they don&apos;t care, but because they can&apos;t tell whether anyone else will show up. Nobody wants to be the only one standing in the square.</p>
            <p className="mt-6">GOODCOIN borrows the energy of the first to fix the second. It turns giving into a weekly public ritual with a single question: <b>will enough of us show up?</b> You can watch the fire grow. You know your gift comes back if it doesn&apos;t catch. And when it does catch, everybody who stood up together receives a little of something that only exists because they did.</p>
          </div>
          <aside className="self-start">
            <div className="frame parchment relative overflow-hidden p-8">
              <div className="rays absolute inset-0 opacity-50" aria-hidden />
              <RaisedHandsArt className="relative mx-auto w-full max-w-sm" />
            </div>
            <blockquote className="mt-8 border-l-4 border-red pl-5">
              <p className="display text-4xl leading-tight">&ldquo;One spark is small. Together, we keep the fire alive.&rdquo;</p>
            </blockquote>
          </aside>
        </div>

        <Ornament className="mx-auto my-20 w-72" />

        <div className="grid gap-14 lg:grid-cols-[0.75fr_1fr]">
          <div className="frame flex items-end justify-center bg-paper p-8"><MonumentalFlame className="h-72" /></div>
          <div className="font-serif text-xl leading-relaxed text-ink/85">
            <p className="eyebrow mb-6 font-sans text-burnt">02 Collective giving</p>
            <p>An assurance contract is an old idea: I&apos;ll put in if enough of you do. It removes the fear of giving alone. GOODCOIN runs one every week, for one public good, with the money held by a contract nobody controls.</p>
            <p className="mt-6">When the fire catches, nine-tenths goes to the cause&apos;s public DAO treasury. The last tenth goes into the Hearth, a shared reserve that backs the token the givers receive. Every later fire that catches strengthens it. So early givers have a stake in the people who give next, and a reason to bring them.</p>
            <p className="mt-6">When the fire doesn&apos;t catch, the gifts come home and that week&apos;s GOOD is struck from the record forever. Failure costs something, visibly, for everyone. That is the point: a movement should feel the weeks it didn&apos;t show up.</p>
          </div>
        </div>
      </article>

      {/* PRINCIPLES */}
      <section className="parchment border-y-[3px] border-ink" aria-labelledby="principles">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
          <p className="eyebrow text-burnt">03 Principles</p>
          <h2 id="principles" className="display misprint mt-3 text-6xl sm:text-7xl md:text-8xl">Five things we won&apos;t bend on.</h2>
          <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <li key={p.no} className={`frame relative bg-paper p-7 ${i === 0 ? "lg:col-span-2" : ""}`}>
                <p className="display text-7xl leading-none text-ember">{p.no}</p>
                <h3 className="display mt-3 text-4xl">{p.title}</h3>
                <p className="mt-3 font-serif text-lg leading-relaxed text-ink/80">{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WHAT IT IS NOT */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <p className="eyebrow text-burnt">04 What this is not</p>
            <h2 className="display misprint mt-3 text-5xl sm:text-6xl">Not an investment. Not a charity token. Not finished.</h2>
          </div>
          <div className="space-y-5 font-serif text-lg leading-relaxed text-ink/85">
            <p>Giving is giving. At the backing floor, the GOOD you receive is worth about 8–9% of your gift on day one. It is a receipt that rises with every later fire that catches. It is measured in NEAR, not dollars, and is never a promise of a market price.</p>
            <p>GOODCOIN is an experiment running on NEAR testnet. It has been through six independent adversarial design reviews and a full test suite, but no professional audit. The causes on testnet are demo DAOs run by the team, labelled as such.</p>
            <p>We would rather you understood it than believed in it. Read the rules, check the contract, then decide.</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button href="/how-it-works" tone="dark">Read the rules</Button>
              <Button href="/security" tone="outline">Check the contract</Button>
            </div>
          </div>
        </div>
      </section>

      <Crowd className="h-28 w-full sm:h-36" />
      <EndBand title="Light one." body="No admin. No premine. Just a fire, and the people around it.">
        <Button href="/app" size="lg">Join this week&apos;s fire</Button>
        <Button href="/good-wall" size="lg" tone="outline">See the record</Button>
      </EndBand>
    </>
  );
}
