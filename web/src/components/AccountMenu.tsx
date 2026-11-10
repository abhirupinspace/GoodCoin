"use client";

import { useEffect, useRef, useState } from "react";
import { formatNear } from "@/lib/format";
import { useAccount, useNearBalance, useVesting } from "@/lib/queries";
import { useNear } from "@/near/NearProvider";
import { TxButton } from "./TxButton";
import { Badge, Button, Good, Skeleton } from "./ui";

/** Connect/disconnect, balances, roles, reward claims and vesting claims for the signed-in account. */
export function AccountMenu() {
  const { accountId, ready, connect } = useNear();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!accountId) {
    return (
      <Button variant="primary" onClick={() => connect()} disabled={!ready}>
        {ready ? "Connect wallet" : "Loading wallets…"}
      </Button>
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="account-panel">
        <span className="max-w-40 truncate font-mono text-xs" title={accountId}>
          {accountId}
        </span>
        <span aria-hidden>▾</span>
      </Button>
      {open && (
        <div
          id="account-panel"
          className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] space-y-4 rounded-xl border border-border bg-card p-4 shadow-lg"
        >
          <AccountDetails accountId={accountId} />
        </div>
      )}
    </div>
  );
}

function AccountDetails({ accountId }: { accountId: string }) {
  const { disconnect } = useNear();
  const account = useAccount(accountId);
  const near = useNearBalance(accountId);
  const vesting = useVesting();
  const a = account.data;
  const mySchedules = (vesting.data ?? []).filter((v) => v.schedule.beneficiary === accountId);

  return (
    <>
      <div>
        <p className="font-mono text-xs break-all">{accountId}</p>
        {a ? (
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted-fg">GOOD balance</dt>
              <dd>
                <Good yocto={a.good_balance} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-fg">NEAR balance</dt>
              <dd className="font-mono tabular-nums">{near.data ? formatNear(near.data, { maxDecimals: 3 }) : "--"} NEAR</dd>
            </div>
          </dl>
        ) : (
          <Skeleton className="mt-2 h-10" />
        )}
        {a && (
          <div className="mt-2 flex flex-wrap gap-1">
            {a.is_reviewer && <Badge tone="info">Reviewer pool</Badge>}
            {a.is_organizer && <Badge tone="info">Organizer</Badge>}
            {a.verified_contributor ? <Badge tone="ok">Verified contributor</Badge> : <Badge>Not yet verified</Badge>}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold">Epoch rewards</h3>
        {a && a.claimable_epochs.length === 0 && <p className="mt-1 text-xs text-muted-fg">Nothing to claim. Rewards appear here after an epoch you contributed to settles as successful.</p>}
        <ul className="mt-2 space-y-2">
          {a?.claimable_epochs.map((e) => (
            <li key={e} className="flex flex-wrap items-start justify-between gap-2 text-sm">
              <span>Epoch {e}</span>
              <TxButton method="claim_reward" args={{ epoch: e }}>
                Claim reward
              </TxButton>
            </li>
          ))}
        </ul>
      </div>

      {mySchedules.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Vesting</h3>
          <ul className="mt-2 space-y-3">
            {mySchedules.map((v) => {
              const claimable = BigInt(v.vested) - BigInt(v.claimed);
              return (
                <li key={v.index} className="text-sm">
                  <p className="capitalize">{v.schedule.name}</p>
                  <p className="text-xs text-muted-fg">
                    Claimable now: <Good yocto={claimable} />
                  </p>
                  <div className="mt-1">
                    <TxButton method="claim_vested" args={{ schedule: v.index }} disabledReason={claimable > 0n ? null : "Nothing vested to claim yet."}>
                      Claim vested
                    </TxButton>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Button onClick={() => disconnect()} className="w-full">
        Disconnect
      </Button>
    </>
  );
}
