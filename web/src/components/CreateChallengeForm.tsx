"use client";

import { useState } from "react";
import { MAX_CATEGORY, MAX_LONG_TEXT, MAX_NAME, MAX_TEXT } from "@/lib/constants";
import { msToNs } from "@/lib/format";
import type { ChallengeInput, ChallengeKind, OpenTo } from "@/lib/types";
import { TxButton } from "./TxButton";
import { Card, Field, inputClass } from "./ui";

/** `<input type="datetime-local">` value for a Date, in local time. */
function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

const HOUR = 3_600_000;

/** Organizer-only: creates a Draft challenge (publish it from the challenge page). Mirrors validate_challenge. */
export function CreateChallengeForm() {
  const [f, setF] = useState(() => {
    const now = Date.now();
    return {
      name: "",
      description: "",
      kind: "Digital" as ChallengeKind,
      category: "",
      instructions: "",
      evidence_requirements: "Public URL; SHA-256 of the linked content",
      eligibility: "Any NEAR account",
      open_to: "Anyone" as OpenTo,
      start: toLocalInput(new Date(now)),
      end: toLocalInput(new Date(now + 24 * HOUR)),
      verify: toLocalInput(new Date(now + 48 * HOUR)),
      max_approved: "100",
      target_participants: "3",
      target_approved: "3",
    };
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const start = new Date(f.start).getTime();
  const end = new Date(f.end).getTime();
  const verify = new Date(f.verify).getTime();
  const errors: Partial<Record<keyof typeof f, string>> = {};
  if (f.name.trim().length < 2) errors.name = "2–80 characters";
  if (!f.description.trim()) errors.description = "Required";
  if (!f.category.trim()) errors.category = "Required, e.g. open-source, cleanup, education";
  if (!f.instructions.trim()) errors.instructions = "Required";
  if (!f.evidence_requirements.trim()) errors.evidence_requirements = "Required";
  if (!f.eligibility.trim()) errors.eligibility = "Required";
  if (!(start < end)) errors.end = "Must be after the start";
  if (!(end <= verify)) errors.verify = "Must be at or after the submission deadline";
  if (!(Number(f.max_approved) > 0)) errors.max_approved = "Must be at least 1";

  const input: ChallengeInput = {
    name: f.name.trim(),
    description: f.description.trim(),
    kind: f.kind,
    category: f.category.trim().toLowerCase(),
    instructions: f.instructions.trim(),
    evidence_requirements: f.evidence_requirements.trim(),
    eligibility: f.eligibility.trim(),
    open_to: f.open_to,
    start_ns: Number.isFinite(start) ? msToNs(start).toString() : "0",
    end_ns: Number.isFinite(end) ? msToNs(end).toString() : "0",
    verification_deadline_ns: Number.isFinite(verify) ? msToNs(verify).toString() : "0",
    max_approved: Math.trunc(Number(f.max_approved)),
    target_participants: Math.trunc(Number(f.target_participants)) || 0,
    target_approved: Math.trunc(Number(f.target_approved)) || 0,
  };
  const firstError = Object.values(errors)[0];

  return (
    <Card title="Create a challenge (organizer)">
      <p className="mb-4 text-sm text-muted-fg">Creates a Draft. Review it on its page, then publish. Published challenges are frozen.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" htmlFor="cc-name" error={errors.name}>
          <input id="cc-name" className={inputClass} maxLength={MAX_NAME} value={f.name} onChange={set("name")} />
        </Field>
        <Field label="Category" htmlFor="cc-cat" error={errors.category}>
          <input id="cc-cat" className={inputClass} maxLength={MAX_CATEGORY} value={f.category} onChange={set("category")} />
        </Field>
        <Field label="Description" htmlFor="cc-desc" error={errors.description}>
          <textarea id="cc-desc" rows={3} className={inputClass} maxLength={MAX_TEXT} value={f.description} onChange={set("description")} />
        </Field>
        <Field label="Instructions" htmlFor="cc-ins" error={errors.instructions}>
          <textarea id="cc-ins" rows={3} className={inputClass} maxLength={MAX_LONG_TEXT} value={f.instructions} onChange={set("instructions")} />
        </Field>
        <Field label="Evidence requirements" htmlFor="cc-ev" error={errors.evidence_requirements}>
          <input id="cc-ev" className={inputClass} maxLength={MAX_TEXT} value={f.evidence_requirements} onChange={set("evidence_requirements")} />
        </Field>
        <Field label="Eligibility (shown to participants)" htmlFor="cc-el" error={errors.eligibility}>
          <input id="cc-el" className={inputClass} maxLength={MAX_TEXT} value={f.eligibility} onChange={set("eligibility")} />
        </Field>
        <Field label="Kind" htmlFor="cc-kind">
          <select id="cc-kind" className={inputClass} value={f.kind} onChange={set("kind")}>
            <option value="Digital">Digital</option>
            <option value="RealWorld">Real world</option>
          </select>
        </Field>
        <Field label="Open to" htmlFor="cc-open">
          <select id="cc-open" className={inputClass} value={f.open_to} onChange={set("open_to")}>
            <option value="Anyone">Any NEAR account</option>
            <option value="VerifiedContributors">Verified contributors only</option>
          </select>
        </Field>
        <Field label="Start (your local time)" htmlFor="cc-start">
          <input id="cc-start" type="datetime-local" className={inputClass} value={f.start} onChange={set("start")} />
        </Field>
        <Field label="Submission deadline" htmlFor="cc-end" error={errors.end}>
          <input id="cc-end" type="datetime-local" className={inputClass} value={f.end} onChange={set("end")} />
        </Field>
        <Field label="Verification deadline" htmlFor="cc-verify" error={errors.verify}>
          <input id="cc-verify" type="datetime-local" className={inputClass} value={f.verify} onChange={set("verify")} />
        </Field>
        <Field label="Max approved deeds" htmlFor="cc-max" error={errors.max_approved}>
          <input id="cc-max" type="number" min={1} inputMode="numeric" className={inputClass} value={f.max_approved} onChange={set("max_approved")} />
        </Field>
        <Field label="Target participants (informational)" htmlFor="cc-tp">
          <input id="cc-tp" type="number" min={0} inputMode="numeric" className={inputClass} value={f.target_participants} onChange={set("target_participants")} />
        </Field>
        <Field label="Target approved deeds (informational)" htmlFor="cc-ta">
          <input id="cc-ta" type="number" min={0} inputMode="numeric" className={inputClass} value={f.target_approved} onChange={set("target_approved")} />
        </Field>
      </div>
      <div className="mt-4">
        <TxButton method="create_challenge" args={{ input }} disabledReason={firstError ? "Fix the highlighted fields first." : null}>
          Create draft
        </TxButton>
      </div>
    </Card>
  );
}
