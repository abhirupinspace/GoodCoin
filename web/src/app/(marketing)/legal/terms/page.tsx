import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/public/ref-LegalDoc";

export const metadata: Metadata = { title: "Terms", description: "Draft terms of use for the GOODCOIN website. Not legal advice." };

export default function TermsPage() {
  return (
    <LegalDoc
      kicker="Terms of use"
      title="Terms, plainly."
      intro={<p>This website is a window onto a smart contract on NEAR testnet. These draft terms say what that means, in plain words.</p>}
      sections={[
        ["An experiment on testnet", <>
          <p>GOODCOIN is experimental software running on NEAR testnet. Testnet tokens have no monetary value. The contract has <strong>not been audited</strong>. It may contain bugs, and because it has no admin keys, bugs cannot be patched in place.</p>
        </>],
        ["Gifts are donations, not investments", <>
          <p>NEAR you give to a fire is a donation to a public-good cause. If the fire catches, 90% goes to the cause and 10% to the Hearth; this cannot be reversed. If it is smothered, your gift is refundable minus the 0.005 NEAR record fee.</p>
          <p>GOOD is not a share, security, deposit or promise of profit. Nothing on this site is investment, tax or legal advice.</p>
        </>],
        ["The floor is not a price guarantee", <>
          <p>The backing floor is denominated in NEAR. It is not a guaranteed market price or USD value. The value of NEAR itself can fall.</p>
        </>],
        ["No custody", <>
          <p>We never hold your keys or your funds. You sign every transaction in your own wallet, and the contract, not us, holds escrows and the Hearth. Nobody, including the authors, can reverse, refund or move funds outside the contract&apos;s rules.</p>
        </>],
        ["Information on this site", <>
          <p>Numbers are read live from the contract through public RPC providers and, for some account history, the NearBlocks indexer. These third parties can be slow, wrong or unavailable. The contract&apos;s state on-chain is the only authority. Cause reports are the causes&apos; own claims and are not verified by the protocol.</p>
        </>],
        ["Your responsibility", <>
          <p>You are responsible for the accounts you use, the transactions you sign and for complying with the laws that apply to you. Don&apos;t use GOODCOIN where doing so is unlawful.</p>
        </>],
        ["No warranty", <>
          <p>The software and site are provided &ldquo;as is&rdquo;, without warranty of any kind, under the MIT License. To the extent the law allows, the authors are not liable for any loss arising from their use.</p>
        </>],
        ["Changes", <>
          <p>This site and these terms may change. The contract cannot. See also the <Link className="underline underline-offset-2" href="/legal/privacy">privacy notice</Link> and the <Link className="underline underline-offset-2" href="/security">security page</Link>.</p>
        </>],
      ]}
    />
  );
}
