"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { getSafeAuthenticatedPath } from "@/lib/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeAuthenticatedPath(searchParams.get("callbackUrl"));
  const [form, setForm] = useState({ tenantSlug: "", email: "", password: "" });
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
    setError(null);
  }

  function handleCredentialsSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn("credentials", { ...form, totpCode, redirect: false });
      if (!result?.ok) {
        setError("E-mail, senha ou organização incorretos.");
        return;
      }
      router.push(callbackUrl);
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef4fb] p-3 sm:p-5">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-300/25 blur-3xl" />
      <div className="absolute -bottom-40 right-0 h-[30rem] w-[30rem] rounded-full bg-blue-300/20 blur-3xl" />
      <div className="relative mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1440px] overflow-hidden rounded-[32px] bg-white shadow-[0_35px_100px_-45px_rgba(8,43,89,.45)] sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden overflow-hidden bg-[#082b59] px-12 py-11 text-white lg:flex lg:flex-col">
          <div className="absolute -right-20 top-24 h-80 w-80 rounded-full border border-cyan-300/20" />
          <div className="absolute -right-4 top-40 h-52 w-52 rounded-full border border-cyan-300/25" />
          <div className="absolute bottom-[-18%] left-[-8%] h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white text-lg font-black text-blue-900">U<span className="absolute bottom-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500" /></div>
            <div><p className="text-sm font-bold tracking-[0.18em]">UVERGS 360</p><p className="text-[11px] text-blue-200/65">Gestão que aproxima</p></div>
          </div>
          <div className="relative my-auto max-w-2xl pb-12">
            <span className="eyebrow-light">Uma nova perspectiva</span>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.08] tracking-[-0.05em]">O Rio Grande do Sul conectado por quem o representa.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-blue-100/75">Dados, relacionamento e inteligência institucional em uma experiência construída para aproximar a UVERGS de cada Câmara e vereador.</p>
          </div>
          <div className="relative grid grid-cols-3 gap-3">
            {["497 municípios", "Visão integrada", "Dados protegidos"].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-xs font-medium text-blue-100 backdrop-blur-sm">{item}</div>)}
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-12 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden"><p className="text-sm font-black tracking-[0.18em] text-blue-900">UVERGS 360</p><p className="mt-1 text-xs text-slate-400">Gestão que aproxima</p></div>
            <span className="eyebrow">Ambiente institucional</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Bem-vindo de volta.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Entre para acessar o centro de gestão da UVERGS.</p>

            {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

              <form onSubmit={handleCredentialsSubmit} className="mt-7 space-y-4">
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Organização</span><input type="text" name="tenantSlug" value={form.tenantSlug} onChange={handleChange} placeholder="uvergs" className="modern-input" required /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">E-mail institucional</span><input type="email" name="email" value={form.email} onChange={handleChange} placeholder="seu@email.com" className="modern-input" required /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Senha</span><input type="password" name="password" value={form.password} onChange={handleChange} className="modern-input" required minLength={8} /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Código 2FA <span className="font-normal text-slate-400">(se estiver ativo)</span></span><input type="text" inputMode="numeric" autoComplete="one-time-code" value={totpCode} onChange={(event) => { setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }} placeholder="000000" maxLength={6} className="modern-input font-mono tracking-[0.25em]" /></label>
                <button type="submit" disabled={isPending} className="primary-button mt-2 w-full disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50">{isPending ? "Verificando acesso..." : "Entrar no UVERGS 360"}</button>
              </form>

            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5 text-[11px] text-slate-400"><span>W9 Sistemas</span><span>v0.1.0 · F1</span></div>
          </div>
        </section>
      </div>
    </main>
  );
}
