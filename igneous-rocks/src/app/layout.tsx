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
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&amp;family=DM+Mono:wght@300;400;500&amp;display=swap" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
