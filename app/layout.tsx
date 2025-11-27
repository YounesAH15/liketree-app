import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // Import de ton nouveau fichier .tsx
import { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LikeTree App",
  description: "YouTube Analytics & History Explorer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* C'est ici qu'on branche le courant pour l'Auth */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}