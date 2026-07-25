// app/layout.js
import "./globals.css";

export const metadata = {
  title: "پارسیان - ابزار اصیل خودرو",
  description: "فروشگاه تخصصی ابزار خودرو پارسیان - ضمانت اصالت و کیفیت",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body className="bg-parsian-concrete text-parsian-steel antialiased">
        {children}
      </body>
    </html>
  );
}
