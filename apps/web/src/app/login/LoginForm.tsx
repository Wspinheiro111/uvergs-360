"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [form, setForm] = useState({ tenantSlug: "", email: "", password: "" });
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn("credentials", { ...form, redirect: false });
      if (!result?.ok) {
        setError("E-mail, senha ou organização incorretos.");
        return;
      }
      router.push(callbackUrl);
    });
  }

  function handleTOTPSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (totpCode.length !== 6) { setError("Código deve ter 6 dígitos."); return; }
    startTransition(async () => {
      const result = await signIn("credentials", { ...form, totpCode, redirect: false });
      if (!result?.ok) { setError("Código inválido ou expirado."); return; }
      router.push(callbackUrl);
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-900 rounded-xl mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">UVERGS 360</h1>
          <p className="text-sm text-slate-500 mt-1">Sistema de Gestão Institucional</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {step === "credentials" ? (
            <>
              <h2 className="text-lg font-medium text-slate-700 mb-6">Acesse sua conta</h2>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Organização</label>
                  <input type="text" name="tenantSlug" value={form.tenantSlug} onChange={handleChange}
                    placeholder="uvergs" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">E-mail</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="seu@email.com" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Senha</label>
                  <input type="password" name="password" value={form.password} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required minLength={8} />
                </div>
                <button type="submit" disabled={isPending}
                  className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors mt-2">
                  {isPending ? "Verificando..." : "Entrar"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <button onClick={() => setStep("credentials")} className="text-slate-400 hover:text-slate-600">←</button>
                <h2 className="text-lg font-medium text-slate-700">Verificação em duas etapas</h2>
              </div>
              <p className="text-sm text-slate-500 mb-6">Insira o código de 6 dígitos do seu aplicativo autenticador.</p>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              <form onSubmit={handleTOTPSubmit} className="space-y-4">
                <input type="text" value={totpCode}
                  onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                  placeholder="000000" maxLength={6} autoFocus
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-2xl text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" disabled={isPending || totpCode.length !== 6}
                  className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {isPending ? "Verificando..." : "Confirmar"}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">UVERGS 360 · W9 Sistemas · v0.1.0-F0</p>
      </div>
    </div>
  );
}
