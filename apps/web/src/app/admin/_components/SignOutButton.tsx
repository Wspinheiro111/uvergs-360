"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function SignOutButton() {
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-800 disabled:cursor-wait disabled:opacity-50"
    >
      {isPending ? "Saindo..." : "Sair"}
    </button>
  );
}
