import type { Metadata, Viewport } from "next";
import { Anuphan, Mitr } from "next/font/google";
import "./globals.css";

const body = Anuphan({ subsets: ["thai", "latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const display = Mitr({ subsets: ["thai", "latin"], weight: ["500", "600"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "ครัวแม่ · สั่งล่วงหน้า",
  description: "สั่งอาหารฝีมือแม่ล่วงหน้า ทำสดส่งวันถัดไป",
};

export const viewport: Viewport = { themeColor: "#1d654a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
