import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ClientConfig } from "../config.js";
import { TercetProvider } from "../ui/context.js";
import { themeCss } from "../theme/index.js";
import { themeScript } from "../ui/theme/script.js";
import ThemeToggle from "../ui/theme/ThemeToggle.js";
import type { Context } from "./types.js";
import "../styles.css";

export interface LayoutProps {
  children: React.ReactNode;
  /**
   * Class names for <html>, typically a `next/font` variable class. The
   * stylesheet reads the font from `--tercet-font`.
   */
  className?: string;
}

export function createLayout({ site }: Context) {
  const client: ClientConfig = { title: site.title, locale: site.locale, messages: site.messages };
  const t = site.messages;

  const metadata: Metadata = {
    metadataBase: new URL(site.siteUrl),
    title: { default: site.title, template: `%s — ${site.title}` },
    description: site.description,
    openGraph: { siteName: site.title, type: "website", locale: site.locale },
    formatDetection: { telephone: false, email: false, address: false },
  };

  const viewport: Viewport = {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: site.theme.light.background },
      { media: "(prefers-color-scheme: dark)", color: site.theme.dark.background },
    ],
  };
  const tokens = themeCss(site.theme);

  function Layout({ children, className }: LayoutProps) {
    return (
      // The theme script may set data-theme before React hydrates.
      <html lang={site.locale} className={className} suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
          {/* Validated in resolveTheme: colour and font characters only. */}
          <style dangerouslySetInnerHTML={{ __html: tokens }} />
        </head>
        <body>
          <TercetProvider value={client}>
            <a href="#main" className="skip-link">
              {t.skipToContent}
            </a>
            <div className="page">
              <main id="main" className="main" tabIndex={-1}>
                {children}
              </main>
              <footer className="footer">
                <Link href="/">{site.title}</Link>
                <span className="footer-sep" aria-hidden="true">
                  ·
                </span>
                <ThemeToggle />
              </footer>
            </div>
          </TercetProvider>
        </body>
      </html>
    );
  }

  return { Layout, metadata, viewport };
}
