import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/public/ref-LegalDoc";

export const metadata: Metadata = { title: "Privacy", description: "Draft privacy notice for the GOODCOIN website. Not legal advice." };

export default function PrivacyPage() {
  return (
    <LegalDoc
      kicker="Legal · privacy"
      title="Privacy, plainly."
      intro={<p>The short version: this site keeps no personal data on its servers. The blockchain, however, is public and permanent.</p>}
      sections={[
        ["What we store", <>
          <p>Nothing about you on our servers. There are no accounts, no sign-ups, no email lists and no server-side database of visitors or wallets.</p>
          <p>The wallet connector may keep your session in your own browserYour wallet connection is kept in your own browser so you stay connected between visits. You can clear it by disconnecting or clearing site data.apos;s storage so you stay connected between visits. You can clear it by disconnecting or clearing site data.</p>
        </>],
        ["The blockchain is public", <>
          <p>Every gift, claim, kindle, redemption and referral is a public transaction on NEAR, tied to your account name, and it cannot be deleted — by you, by us or by anyone. Choose an account name with that in mind.</p>
        </>],
        ["Third parties", <>
          <p>To read the chain, your browser and our server contact public NEAR RPC providers, and the explorer and account-history features use NearBlocks. Your wallet is provided by its own developer. Each of these sees your requests (including your IP address and the accounts you look up) under its own privacy policy.</p>
          <p>Our server may pass an account name to these services when you open a history or transactions page; it does not keep it.</p>
        </>],
        ["Hosting logs", <>
          <p>Like any website, the hosting provider may keep short-lived technical logs (such as IP address and requested page) for security and reliability.</p>
        </>],
        ["Questions", <>
          <p>Open an issue on the project&apos;s public repository. See also the <Link className="underline underline-offset-2" href="/legal/terms">terms of use</Link>.</p>
        </>],
      ]}
    />
  );
}
