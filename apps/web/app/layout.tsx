import type { ReactNode } from "react";
import "../styles/globals.css";

export const metadata = {
  title: "ParsianStore",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
