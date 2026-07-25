import type { ReactNode } from "react";
import "../styles/globals.css";
import { bodyFont, displayFont, monoFont } from "@/lib/fonts";

export const metadata = {
  title: "ParsianStore",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <body className="font-body">{children}</body>
    </html>
  );
}
