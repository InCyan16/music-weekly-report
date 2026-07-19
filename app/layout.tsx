import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "音乐日记 | Music Diary",
  description: "以黑胶唱片记录你的每日音乐时光",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
