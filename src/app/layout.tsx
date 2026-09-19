import type { Metadata } from "next";
import { Web3Providers } from "@/components/web3/providers";
import { UtilityBar } from "@/components/layout/utility-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Building certificates",
  description: "Issue and verify building certificates on Ethereum",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Web3Providers>
          <UtilityBar />
          {children}
        </Web3Providers>
      </body>
    </html>
  );
}
