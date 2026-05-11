import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SL4: Yudkowsky × Goertzel",
  description:
    "Browse 13,443 emails from threads where Eliezer Yudkowsky or Ben Goertzel posted on the SL4 mailing list (2000–2012).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
