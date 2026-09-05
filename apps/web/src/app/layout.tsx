import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UVERGS 360",
  description: "Sistema Integrado de Gestão Institucional — W9 Sistemas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
