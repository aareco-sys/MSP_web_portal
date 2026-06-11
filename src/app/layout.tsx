import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { PrintHeader } from "@/components/print-header";
import { I18nProvider } from "@/lib/i18n/context";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/config";

// Fuentes de marca self-hosted (TTF variables) — sin dependencia de red.
const display = localFont({
  src: "../fonts/Montserrat.ttf",
  variable: "--font-display",
  weight: "100 900",
  display: "swap",
});
const body = localFont({
  src: "../fonts/Roboto.ttf",
  variable: "--font-body",
  weight: "100 900",
  display: "swap",
});
const ui = localFont({
  src: "../fonts/SpaceGrotesk.ttf",
  variable: "--font-ui",
  weight: "300 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MSP Metrics Portal — DinoCloud",
  description: "Métricas centralizadas de ClickUp · DinoCloud Internal - Confidential",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return (
    <html lang={locale} className={`${display.variable} ${body.variable} ${ui.variable}`}>
      <body>
        <I18nProvider initialLocale={locale}>
          <Providers>
            <div className="app">
              <Suspense fallback={<aside className="sidebar" />}>
                <Sidebar />
              </Suspense>
              <div className="main">
                <Suspense fallback={null}>
                  <Topbar />
                </Suspense>
                <div className="content">
                  <Suspense fallback={null}>
                    <PrintHeader />
                  </Suspense>
                  <Suspense fallback={null}>{children}</Suspense>
                </div>
              </div>
            </div>
          </Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
