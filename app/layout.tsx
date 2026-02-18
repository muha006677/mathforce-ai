import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TopSystemBar } from "@/components/TopSystemBar";
import { AuthGuard } from "@/components/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MathForce AI",
  description: "MathForce AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="kk" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("mathforce_theme");document.documentElement.classList.toggle("dark",t!=="light");})();`,
          }}
        />
        <ThemeProvider>
          {/* 1. Fixed left sidebar */}
          <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800 dark:from-[#0f172a] dark:to-[#111c3a] dark:text-slate-200">
            <aside className="fixed inset-y-0 left-0 z-20 w-56 border-r border-slate-200 bg-slate-50/95 px-4 py-5 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/80">
              <div className="mb-6">
                <div className="font-mono text-base font-semibold text-slate-800 dark:text-slate-100">
                  MathForce AI
                </div>
                <div className="mt-0.5 text-[0.6rem] uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Платформа
                </div>
              </div>
              <nav className="space-y-0.5 text-sm">
                <SidebarLink href="/">Жаттығу</SidebarLink>
                <SidebarLink href="/review">Қате талдау</SidebarLink>
                <SidebarLink href="/result">Аналитика</SidebarLink>
                <SidebarLink href="/growth">Өсу динамикасы</SidebarLink>
              </nav>
            </aside>

            {/* 2. Top system status bar + 3. Main content area */}
            <div className="relative ml-56 flex min-h-screen flex-1 flex-col overflow-hidden">
              <div className="dashboard-grid" aria-hidden="true" />
              <div className="scan-line" aria-hidden="true" />
              <div className="corner-accent corner-accent-tl" aria-hidden="true" />
              <div className="corner-accent corner-accent-tr" aria-hidden="true" />
              <div className="corner-accent corner-accent-bl" aria-hidden="true" />
              <div className="corner-accent corner-accent-br" aria-hidden="true" />

              <TopSystemBar />
              <main className="relative flex flex-1 flex-col overflow-auto px-6 pb-6 pt-2">
                <AuthGuard>{children}</AuthGuard>
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

type SidebarLinkProps = {
  href: string;
  children: React.ReactNode;
};

function SidebarLink({ href, children }: SidebarLinkProps) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-md px-2.5 py-2 text-slate-600 transition-colors hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50"
    >
      <span>{children}</span>
      <span className="text-[0.55rem] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        КӨРУ
      </span>
    </a>
  );
}
