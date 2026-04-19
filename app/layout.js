// app/layout.js
import "./globals.css";

export const metadata = {
  title: "جعبه استاد - ابزار اورجینال خودرو",
  description: "فروشگاه تخصصی ابزار خودرو با ضمانت اصل بودن کالا",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        {/* Load fonts via CSS instead of next/font to avoid the bug */}
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body className="bg-ostad-concrete text-ostad-steel antialiased">
        {children}
      </body>
    </html>
  );
}
