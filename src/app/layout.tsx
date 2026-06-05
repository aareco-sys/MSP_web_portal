import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import { FilterBar } from "@/components/filter-bar";
import { LanguageToggle } from "@/components/language-toggle";
import { I18nProvider } from "@/lib/i18n/context";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/config";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <I18nProvider initialLocale={locale}>
          <Providers>
            <header
              data-noprint
              className="sticky top-0 z-30 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80"
            >
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold">MSP Metrics</span>
                  <span className="hidden text-xs text-neutral-400 sm:inline">
                    DinoCloud Internal · Confidential
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Suspense fallback={null}>
                    <Nav />
                  </Suspense>
                  <LanguageToggle />
                </div>
              </div>
            </header>
            <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
              <div data-noprint>
                <Suspense fallback={null}>
                  <FilterBar />
                </Suspense>
              </div>
              <Suspense fallback={null}>{children}</Suspense>
            </main>
            <footer
              data-noprint
              className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-neutral-400"
            >
              DinoCloud Internal - Confidential
            </footer>
          </Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
