import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Igneous Rocks",
  description: "EARTHSC 1105 Final Project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
