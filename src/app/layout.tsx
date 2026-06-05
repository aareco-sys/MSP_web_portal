import type { Metadata } from "next";
import { Montserrat, Roboto, Space_Grotesk } from "next/font/google";
import { Suspense } from "react";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { I18nProvider } from "@/lib/i18n/context";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/config";

const display = Montserrat({ subsets: ["latin"], variable: "--font-display" });
const body = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-body" });
const ui = Space_Grotesk({ subsets: ["latin"], variable: "--font-ui" });

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
