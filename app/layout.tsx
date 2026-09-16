import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { GlobalContextProvider } from "@/context/GlobalContext";
import { Cabecera } from "@/components/Cabecera";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Sede Electrónica — Registro General",
  description:
    "Registro General de la Administración: presentación de instancias, tramitación de expedientes y actuaciones.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const usuario = await getSession();

  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <GlobalContextProvider initialUsuario={usuario}>
          <Cabecera />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-line px-6 py-6 text-center text-sm text-slate-dim font-sans">
            Sede Electrónica — Registro General de la Administración
          </footer>
        </GlobalContextProvider>
      </body>
    </html>
  );
}
