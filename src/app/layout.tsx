import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { siteUrl } from '../interfaces/web/data';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'DevSignal AI — Engineering intelligence, distilled.',
    template: '%s · DevSignal AI',
  },
  description:
    'Source-grounded engineering dispatches. Independent AI review, checked TypeScript examples, and transparent publication gates.',
  openGraph: {
    type: 'website',
    siteName: 'DevSignal AI',
    title: 'DevSignal AI',
    description: 'Engineering intelligence, distilled.',
  },
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="shell header-inner">
            <Link href="/" className="brand" aria-label="DevSignal AI home">
              <span className="brand-icon" aria-hidden="true">
                d<span>›</span>
              </span>
              DevSignal<span className="brand-ai">AI</span>
            </Link>
            <nav aria-label="Main navigation">
              <Link href="/#dispatches">Dispatches</Link>
              <Link href="/status/">Pipeline</Link>
              <Link href="/about/">
                Our approach <span aria-hidden="true">↗</span>
              </Link>
            </nav>
            <span className="header-label">
              <span className="tiny-dot" /> SOURCE-GROUNDED
            </span>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="shell footer-inner">
            <div>
              <Link className="brand footer-brand" href="/">
                DevSignal<span className="brand-ai">AI</span>
              </Link>
              <p>Less noise. More engineering.</p>
            </div>
            <p className="disclosure">
              Articles are AI-generated from public sources and validated
              automatically. Review scores are model assessments, not a
              guarantee of correctness. Always consult the original sources.
            </p>
            <Link className="text-link" href="/about/">
              Built in the open <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="shell footer-bottom">
            <span>INDEPENDENT SIGNAL / OPEN KNOWLEDGE</span>
            <span>STATIC BY DESIGN. INTELLIGENT BY PROCESS.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
