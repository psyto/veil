import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SolanaProvider } from "@/components/providers/solana-provider";
import { ShadowModeProvider } from "@/hooks/use-shadow-mode";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShadowLaunch - Privacy-First Token Launches",
  description:
    "Buy tokens on Pump.fun without leaving a trace. Shadow Mode breaks the on-chain link between your wallet and your purchases.",
  keywords: [
    "pump.fun",
    "solana",
    "privacy",
    "defi",
    "token",
    "launch",
    "shadow",
    "anonymous",
  ],
  authors: [{ name: "ShadowLaunch" }],
  openGraph: {
    title: "ShadowLaunch - Privacy-First Token Launches",
    description:
      "Buy tokens on Pump.fun without leaving a trace. Shadow Mode breaks the on-chain link between your wallet and your purchases.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShadowLaunch - Privacy-First Token Launches",
    description:
      "Buy tokens on Pump.fun without leaving a trace. Shadow Mode breaks the on-chain link between your wallet and your purchases.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <SolanaProvider>
          <ShadowModeProvider defaultMode="shadow">
            <div className="min-h-screen bg-background">
              {children}
            </div>
            <Toaster />
          </ShadowModeProvider>
        </SolanaProvider>
      </body>
    </html>
  );
}
