"use client";
// /fires/<account>: select that fire everywhere, then open its live page in the app.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isValidFireId } from "@/lib/config";
import { useFireContext } from "@/lib/fire-context";
import { Notice } from "@/components/ui";

export function OpenFire({ id }: { id: string }) {
  const { setFire } = useFireContext();
  const router = useRouter();
  const ok = isValidFireId(id);
  useEffect(() => {
    if (!ok) return;
    setFire(id);
    router.replace(`/app?fire=${encodeURIComponent(id)}`);
  }, [id, ok, setFire, router]);
  return (
    <section className="shell py-24">
      {ok ? <p className="meta text-mute">Opening {id}…</p> : <Notice tone="error" title="Not a fire account">Check the link.</Notice>}
    </section>
  );
}
