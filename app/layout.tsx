import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { AppQueryProvider } from "@/lib/hooks/use-query-client";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope"
});

export const metadata: Metadata = {
  title: "Cal Clone",
  description: "Cal.com-style scheduler UI built against the local Express + Prisma backend."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        <AppQueryProvider>{children}</AppQueryProvider>
      </body>
    </html>
  );
}
