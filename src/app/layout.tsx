import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "四国サーフコンディション",
  description: "小松・生見・浮鞭の海況を、ボード別に判定するWebアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
