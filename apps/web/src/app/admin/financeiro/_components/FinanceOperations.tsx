"use client";

import type { BudgetExecutionRow } from "@/lib/financial-data";
import { currency } from "@/lib/format";

import { createBudgetLineAction } from "../actions";

const inputClass = "form-input";

export function BudgetPanel({ data }: { data: BudgetExecutionRow[] }) {
  return <div className="space-y-6"><form action={createBudgetLineAction} className="surface-panel p-6"><span className="eyebrow">Planejamento</span><h2 className="mt-1 text-xl font-semibold text-slate-950">Adicionar linha ao orçamento aprovado</h2><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Input label="Ano"><input className={inputClass} name="year" type="number" min="2020" max="2200" defaultValue={new Date().getFullYear()} required /></Input><Input label="Mês"><input className={inputClass} name="month" type="number" min="1" max="12" required /></Input><Input label="Natureza"><select className={inputClass} name="nature"><option value="revenue">Receita</option><option value="expense">Despesa</option></select></Input><Input label="Categoria"><input className={inputClass} name="category" minLength={2} maxLength={80} required placeholder="Ex.: Capacitação" /></Input><Input label="Valor planejado"><input className={inputClass} name="amount" inputMode="decimal" required placeholder="0,00" /></Input></div><div className="mt-5 flex justify-end"><button className="rounded-xl bg-[#0b4b7e] px-5 py-3 text-sm font-semibold text-white">Adicionar ao orçamento</button></div></form><section className="surface-panel overflow-hidden"><header className="border-b border-slate-200 p-6"><span className="eyebrow">Execução real</span><h2 className="mt-1 text-xl font-semibold">Orçado x realizado</h2></header><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="p-4">Período</th><th className="p-4">Conta</th><th className="p-4">Centro</th><th className="p-4">Planejado</th><th className="p-4">Realizado</th></tr></thead><tbody>{data.map((row,index)=><tr className="border-t border-slate-100" key={`${row.year}-${row.month}-${row.accountName}-${index}`}><td className="p-4">{String(row.month).padStart(2,"0")}/{row.year}</td><td className="p-4 font-medium">{row.accountName}</td><td className="p-4">{row.costCenterName}</td><td className="p-4">{currency(row.plannedCents)}</td><td className="p-4">{currency(row.actualCents)}</td></tr>)}</tbody></table></div></section></div>;
}

// ReconciliationPanel removido — conciliação bancária fora do escopo v2.
// A UI de importar extrato/conciliar/ignorar não é mais exposta ao produto.

function Input({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label} *</span>{children}</label>; }
