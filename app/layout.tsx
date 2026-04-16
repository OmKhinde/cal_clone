import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppQueryProvider } from "@/lib/hooks/use-query-client";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Cal Clone",
  description: "Cal.com-style scheduler UI built against the local Express + Prisma backend."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <AppQueryProvider>{children}</AppQueryProvider>
      </body>
    </html>
  );
}
