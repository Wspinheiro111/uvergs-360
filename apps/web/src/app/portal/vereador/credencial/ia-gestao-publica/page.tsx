import Link from "next/link";

const QR_ROWS = ["1111111001000011011100011111110010100100101111111","1000001000010100101001110000101111010011101000001","1011101011010000011001001101101111000001101011101","1011101010111110100000110010001100111101001011101","1011101011010011000111111111001111000100001011101","1000001010110010011011100010000110111010001000001","1111111010101010101010101010101010101010101111111","0000000011100100111110100011100010100100000000000","1011111001011111011010111110011101011101101111100","1000100000101010001101000101111000011100011100000","0100111100110100100100010011000001100011010110011","0011100010001100010110000111101110010000100110001","1111111000010001100101111110000100001010100101111","0111010100001101001001011000001000011100001001010","1010001100111010010100000010100000110110100000111","0010110011011110101001010100001101011010110010001","0110011101001001011010001101011000001101111000100","0111010011111000000000010100001101011100011110010","0010001101001100111101011011011000001011100101011","0000100111100101101000000001110010010101001110011","0001011011000001000111101100011101111100101000111","1011100011100011101100001000011001010100001110000","1010111111000111101100111110000100110110111111111","1101100011001011101100100010110110100111100011010","1010101010000111111011101010000101011010101010101","1010100011011100011001100010011100010101100010100","1000111110110011001100111111100111111111111111011","0101010100001100111100011101110111000100100001011","0011101001110110100001111101010101101001001011111","0001110011011000011111001101011100010100001000000","0110011001001001000010011100000001101011011111011","0000110110001001111110001011010000101000110110010","0010101001000101110010100110100111110111010111110","1100000010110001110100011101110010100101010100000","1100011110110110010101110000101111010011101101011","0110110001010000010010001111111011000000100000010","0101111111110001100011010110010101001011111110111","0000100111110100111101101011111101001101110001000","0100011100111001010010110101000001110011111001011","0111000011100101000100101011100011110100100001000","1110001000101011111010111110001100011001111110101","0000000011111011101100100010011100011100100010110","1111111001111111000011101010000001111010101011101","1000001011111000100001100010101010010000100010011","1011101010111011010100111110010100011100111111110","1011101011101000011000110110011100010101110111010","1011101010101010101100111011110111111010010100011","1000001001011000001000111110001101001000011000001","1111111010011100000010001001011000001100010001111"];

function QrCode() {
  const size = QR_ROWS.length;
  return <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR Code da credencial" className="h-full w-full bg-white p-3" shapeRendering="crispEdges">
    <rect width={size} height={size} fill="white" />
    {QR_ROWS.flatMap((row,y)=>Array.from(row).map((cell,x)=>cell==="1"?<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#07152f"/>:null))}
  </svg>;
}

export default function CredencialEventoPage() {
  return <div className="min-h-screen bg-[#eef6ff] text-slate-950">
    <header className="border-b border-blue-100 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1300px] items-center gap-4 px-5 lg:px-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-800 to-cyan-500 font-black text-white">U</div>
        <div className="flex-1"><p className="text-sm font-black text-blue-950">Meu UVERGS</p><p className="text-[10px] text-slate-400">Credencial digital demonstrativa</p></div>
        <Link href="/portal/vereador" className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Voltar ao portal</Link>
      </div>
    </header>

    <main className="mx-auto max-w-[1300px] px-5 py-10 lg:px-10 lg:py-14">
      <section className="grid gap-7 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div>
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-emerald-700">✓ Inscrição confirmada</span>
          <h1 className="mt-5 text-4xl font-black tracking-[-.045em] lg:text-6xl">Sua entrada no evento está aqui.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">Apresente este QR Code no credenciamento. A leitura identifica sua inscrição e registra a presença no fluxo do evento.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Evento</p><p className="mt-2 text-sm font-black text-slate-900">Inteligência Artificial na Gestão Pública</p></div>
            <div className="rounded-2xl border border-blue-100 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Data e local</p><p className="mt-2 text-sm font-black text-slate-900">24/09/2026 • Porto Alegre</p></div>
            <div className="rounded-2xl border border-blue-100 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Participante</p><p className="mt-2 text-sm font-black text-slate-900">Ana Martins</p></div>
            <div className="rounded-2xl border border-blue-100 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Câmara</p><p className="mt-2 text-sm font-black text-slate-900">Câmara Municipal de Santo Ângelo</p></div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute -inset-4 rounded-[42px] bg-gradient-to-br from-blue-200/50 to-emerald-200/50 blur-2xl" />
          <article className="relative overflow-hidden rounded-[38px] border border-white bg-white shadow-2xl shadow-blue-200/60">
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 p-6 text-white">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-blue-200">UVERGS 360</p><h2 className="mt-2 text-2xl font-black">Credencial de acesso</h2></div><span className="rounded-full bg-emerald-300 px-3 py-1 text-[9px] font-black text-emerald-950">ATIVA</span></div>
              <p className="mt-5 text-sm font-bold">Ana Martins</p><p className="mt-1 text-xs text-blue-100">Vereadora • Santo Ângelo</p>
            </div>
            <div className="p-6">
              <div className="mx-auto aspect-square max-w-[300px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-inner"><QrCode /></div>
              <div className="mt-5 text-center"><p className="text-sm font-black text-slate-900">Código: U360-IA-2026-00142</p><p className="mt-1 text-xs text-slate-400">QR real apontando para esta credencial demonstrativa</p></div>
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-center"><p className="text-xs font-black text-emerald-800">Pronto para credenciamento</p><p className="mt-1 text-[10px] text-emerald-600">Uso único por evento na versão de produção</p></div>
            </div>
          </article>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-[26px] border border-slate-200 bg-white p-5"><div className="text-2xl">①</div><h3 className="mt-3 font-black">Abra a credencial</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">O vereador acessa pelo Meu UVERGS no celular.</p></article>
        <article className="rounded-[26px] border border-slate-200 bg-white p-5"><div className="text-2xl">②</div><h3 className="mt-3 font-black">Apresente o QR</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">A equipe faz a leitura no balcão de credenciamento.</p></article>
        <article className="rounded-[26px] border border-slate-200 bg-white p-5"><div className="text-2xl">③</div><h3 className="mt-3 font-black">Presença confirmada</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">O evento, Perfil 360º e certificado ficam conectados.</p></article>
      </section>

      <section className="mt-6 flex flex-col gap-4 rounded-[30px] border border-amber-100 bg-amber-50 p-6 lg:flex-row lg:items-center lg:justify-between"><p className="max-w-3xl text-xs leading-relaxed text-amber-900"><b>Demonstração:</b> esta credencial não representa inscrição real. Em produção, o token do QR deve ser assinado, ter escopo por evento, expiração e proteção contra reutilização.</p><Link href="/admin/growth/checkin" className="rounded-2xl bg-amber-400 px-5 py-3 text-center text-sm font-black text-amber-950">Abrir painel de check-in</Link></section>
    </main>
  </div>;
}
