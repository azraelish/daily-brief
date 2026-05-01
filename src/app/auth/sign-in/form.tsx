"use client";

import { useFormState, useFormStatus } from "react-dom";
import { sendMagicLink, type SignInState } from "./actions";

const initial: SignInState = { ok: false, message: "" };

export default function SignInForm() {
  const [state, action] = useFormState(sendMagicLink, initial);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="block text-xs uppercase tracking-widest text-neutral-500">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="mt-2 w-full rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-sm outline-none focus:border-neutral-600"
          placeholder="you@example.com"
        />
      </label>
      <SubmitButton />
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-400" : "text-rose-400"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send magic link"}
    </button>
  );
}
