import Link from "next/link";

const funil = [
  { etapa: "Base qualificada", valor: 4680, taxa: "100%", largura: "100%" },
  { etapa: "Alcançados", valor: 3920, taxa: "84%", largura: "84%" },
  { etapa: "Engajados", valor: 610, taxa: "13%", largura: "45%" },
  { etapa: "Inscritos", valor: 142, taxa: "3,0%", largura: "28%" },
  { etapa: "Presentes", valor: 118, taxa: "83% dos inscritos", largura: "23%" },
];

const origens = [
  { canal: "E-mail segmentado", inscritos: 55, presentes: 45, receita: "R$ 54.000", conversao: "82%" },
  { canal: "SMS de recuperação", inscritos: 32, presentes: 28, receita: "R$ 33.600", conversao: "88%" },
  { canal: "Portal da Câmara", inscritos: 27, presentes: 24, receita: "R$ 28.800", conversao: "89%" },
  { canal: "Indicação", inscritos: 16, presentes: 12, receita: "R$ 14.400", conversao: "75%" },
  { canal: "Orgânico", inscritos: 12, presentes: 9, receita: "R$ 10.800", conversao: "75%" },
];

const regioes = [
  ["Missões", 29, "24,6%"],
  ["Noroeste", 24, "20,3%"],
  ["Central", 22, "18,6%"],
  ["Serra", 18, "15,3%"],
  ["Metropolitana", 16, "13,6%"],
  ["Outras regiões", 9, "7,6%"],
];

const sinais = [
  ["Inscrições recuperadas", "12", "após abandono"],
  ["Novos participantes", "31", "primeira presença UVERGS"],
  ["Câmaras representadas", "76", "cobertura institucional"],
  ["Retorno à jornada", "84", "público para pós-evento"],
];

const temasPosEvento = [
  ["Inteligência Artificial", 62, "74%"],
  ["Gestão pública", 48, "57%"],
  ["Fiscalização", 29, "35%"],
  ["Comunicação", 21, "25%"],
];

export default function Evento360Page(){
  return <div className="min-h-screen bg-[#f6f9fe] p-6 lg:p-10 text-slate-950">
    <div className="max-w-[1500px] mx-auto">
      <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-700 p-7 lg:p-10 text-white shadow-2xl shadow-blue-200/50">
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Evento 360</span><span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-[10px] font-black text-emerald-200">Demonstração</span></div><h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-.045em] leading-[.98] lg:text-6xl">Do primeiro contato ao próximo relacionamento.</h1><p className="mt-5 max-w-3xl text-base leading-relaxed text-blue-100 lg:text-lg">Inteligência Artificial na Gestão Pública • 24 de setembro • Porto Alegre</p></div>
          <div className="flex flex-wrap gap-3"><Link href="/eventos/ia-gestao-publica" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-900">Ver landing pública</Link><Link href="/portal/vereador/avaliacao/ia-gestao-publica" className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white">Ver pós-evento</Link></div>
        </div>
        <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["142","inscrições"],["118","presenças"],["83,1%","show rate"],["R$ 141,6 mil","receita bruta demo"]].map(([v,l])=><div key={l} className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur"><p className="text-3xl font-black">{v}</p><p className="mt-2 text-xs text-blue-100">{l}</p></div>)}</div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Funil do evento</p><h2 className="mt-2 text-3xl font-black tracking-tight">Alcance → presença</h2></div><span className="text-xs font-semibold text-slate-400">Cenário ilustrativo</span></div>
          <div className="mt-7 space-y-4">{funil.map((item,i)=><div key={item.etapa}><div className="mb-2 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className={`flex h-7 w-7 items-center justify-center rounded-xl text-[10px] font-black ${i===funil.length-1?"bg-emerald-100 text-emerald-700":"bg-blue-50 text-blue-700"}`}>{i+1}</span><b className="text-sm text-slate-800">{item.etapa}</b></div><div className="text-right"><b className="text-sm text-slate-900">{item.valor.toLocaleString("pt-BR")}</b><span className="ml-2 text-[10px] text-slate-400">{item.taxa}</span></div></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${i===funil.length-1?"bg-gradient-to-r from-emerald-500 to-cyan-400":"bg-gradient-to-r from-blue-700 to-cyan-400"}`} style={{width:item.largura}}/></div></div>)}</div>
        </article>

        <article className="rounded-[32px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 lg:p-8">
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-emerald-700">Leitura executiva</p><h2 className="mt-2 text-3xl font-black tracking-tight">O que este evento ensinou?</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">{sinais.map(([titulo,valor,nota])=><div key={titulo} className="rounded-2xl border border-emerald-100 bg-white p-5"><p className="text-3xl font-black text-emerald-700">{valor}</p><p className="mt-2 text-sm font-black text-slate-800">{titulo}</p><p className="mt-1 text-xs text-slate-400">{nota}</p></div>)}</div>
          <div className="mt-5 rounded-2xl bg-[#0b2554] p-5 text-white"><p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Próxima ação sugerida</p><p className="mt-2 text-lg font-black">Criar jornada de recorrência para os 31 novos participantes.</p><p className="mt-2 text-xs leading-relaxed text-blue-100">Conectar satisfação + temas de interesse ao próximo conteúdo relevante em até 30 dias.</p></div>
        </article>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <article className="rounded-[32px] bg-gradient-to-br from-violet-900 via-blue-800 to-cyan-600 p-6 text-white lg:p-8">
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-cyan-200">Voz do participante</p><h2 className="mt-2 text-3xl font-black tracking-tight">O evento continua gerando inteligência depois do encerramento.</h2>
          <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-3xl font-black">84</p><p className="mt-1 text-xs text-blue-100">respostas pós-evento</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-3xl font-black">73</p><p className="mt-1 text-xs text-blue-100">NPS demonstrativo</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-3xl font-black">56</p><p className="mt-1 text-xs text-blue-100">querem próximos eventos</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-3xl font-black">22</p><p className="mt-1 text-xs text-blue-100">novos + alta satisfação</p></div></div>
          <Link href="/portal/vereador/avaliacao/ia-gestao-publica" className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-900">Abrir avaliação demonstrativa →</Link>
        </article>

        <article className="rounded-[32px] border border-violet-100 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-violet-600">Interesses declarados</p><h2 className="mt-2 text-3xl font-black tracking-tight">O próximo evento começa aqui.</h2></div><span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-black text-violet-700">84 respostas demo</span></div>
          <div className="mt-7 space-y-5">{temasPosEvento.map(([tema,valor,pct],i)=><div key={tema}><div className="mb-2 flex items-center justify-between gap-4"><b className="text-sm text-slate-800">{tema}</b><span className="text-xs font-bold text-slate-400">{valor} • {pct}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${i===0?"bg-gradient-to-r from-violet-600 to-blue-500":"bg-gradient-to-r from-blue-600 to-cyan-400"}`} style={{width:String(pct)}}/></div></div>)}</div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Segmento sugerido</p><p className="mt-2 text-sm font-black text-emerald-950">Promotores + interesse em IA</p></div><div className="rounded-2xl bg-blue-50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Conteúdo</p><p className="mt-2 text-sm font-black text-blue-950">Oficina avançada em 30 dias</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Recuperação</p><p className="mt-2 text-sm font-black text-amber-950">Contato humano com detratores</p></div></div>
        </article>
      </section>

      <section className="mt-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Atribuição por origem</p><h2 className="mt-2 text-3xl font-black tracking-tight">Qual canal trouxe presença e receita?</h2></div><p className="max-w-md text-right text-xs leading-relaxed text-slate-400">Receita calculada para demonstração com valor médio informado de aproximadamente R$ 1.200 por participante presente.</p></div>
        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400"><th className="pb-3">Origem</th><th className="pb-3">Inscritos</th><th className="pb-3">Presentes</th><th className="pb-3">Show rate</th><th className="pb-3 text-right">Receita atribuída</th></tr></thead><tbody>{origens.map((o)=><tr key={o.canal} className="border-b border-slate-100 last:border-0"><td className="py-4"><div className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-blue-600"/><b className="text-sm text-slate-800">{o.canal}</b></div></td><td className="py-4 text-sm font-bold text-slate-600">{o.inscritos}</td><td className="py-4 text-sm font-bold text-slate-600">{o.presentes}</td><td className="py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{o.conversao}</span></td><td className="py-4 text-right text-sm font-black text-blue-800">{o.receita}</td></tr>)}</tbody></table></div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8"><p className="text-[11px] font-black uppercase tracking-[.2em] text-indigo-600">Cobertura regional</p><h2 className="mt-2 text-2xl font-black">De onde vieram os 118 participantes?</h2><div className="mt-6 space-y-4">{regioes.map(([nome,valor,pct],i)=><div key={nome}><div className="mb-2 flex items-center justify-between"><b className="text-sm text-slate-700">{nome}</b><span className="text-xs font-bold text-slate-400">{valor} • {pct}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${i<2?"bg-indigo-600":"bg-blue-400"}`} style={{width:`${Math.max(22,Number(String(pct).replace(",",".").replace("%",""))*2.5)}%`}}/></div></div>)}</div></article>
        <article className="rounded-[32px] bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 ring-1 ring-blue-100 lg:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-700">Valor institucional</p><h2 className="mt-2 text-3xl font-black tracking-tight">Receita é importante. Relacionamento é o ativo.</h2></div><span className="rounded-full bg-blue-700 px-3 py-1.5 text-[10px] font-black text-white">UVERGS 360</span></div><p className="mt-4 max-w-4xl text-sm leading-relaxed text-slate-500">O painel permite medir resultado financeiro sem reduzir o evento a faturamento. Novos participantes, Câmaras representadas, regiões alcançadas, satisfação, interesses e recorrência passam a fazer parte da leitura de sucesso.</p><div className="mt-6 grid gap-3 md:grid-cols-3"><div className="rounded-2xl bg-white p-5 ring-1 ring-blue-100"><p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Receita demo</p><p className="mt-2 text-2xl font-black text-blue-900">R$ 141,6 mil</p><p className="mt-1 text-xs text-slate-400">118 × R$ 1.200</p></div><div className="rounded-2xl bg-white p-5 ring-1 ring-blue-100"><p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Novos vínculos</p><p className="mt-2 text-2xl font-black text-blue-900">31</p><p className="mt-1 text-xs text-slate-400">primeira participação</p></div><div className="rounded-2xl bg-white p-5 ring-1 ring-blue-100"><p className="text-[10px] font-black uppercase tracking-widest text-blue-500">NPS demo</p><p className="mt-2 text-2xl font-black text-blue-900">73</p><p className="mt-1 text-xs text-slate-400">84 respostas</p></div></div></article>
      </section>

      <section className="mt-6 rounded-[32px] border border-amber-100 bg-amber-50 p-5"><p className="text-xs leading-relaxed text-amber-900"><b>Importante:</b> todos os números desta tela são sintéticos e existem exclusivamente para demonstrar como o UVERGS 360 poderá atribuir alcance, inscrição, presença, satisfação e resultado. O valor de R$ 1.200 foi usado apenas como referência de simulação a partir da operação informada e não representa garantia de receita.</p></section>
      <footer className="mt-8 border-t border-slate-200 py-5 text-xs text-slate-400">UVERGS 360 • Evento 360 • Aquisição, presença, pós-evento e relacionamento demonstrativos</footer>
    </div>
  </div>;
}
