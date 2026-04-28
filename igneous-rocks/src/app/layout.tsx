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
        <link rel="icon" type="image/png" href="/Rock.svg" />

        {/* Primary Meta Tags for SEO (search engine optimization) and acts as a default in case the platform doesn't support the other tags (OpenGraph/Twitter). */}
        <meta name="title" content="Igneous Rock Gallery" />
        <meta name="description" content="A collection of images of different igneous rocks based on origin and composition." />

        {/*  Open Graph meta tags for social media and messaging platforms. */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://gallery.adityabdev.com/" />
        <meta property="og:title" content="Igneous Rock Gallery" />
        <meta property="og:description" content="A collection of images of different igneous rocks based on origin and composition." />
        <meta property="og:image" content="https://gallery.adityabdev.com/Gallery.jpg" />

        {/* Twitter meta tags in case this site needs to be shared on X. */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://gallery.adityabdev.com/" />
        <meta property="twitter:title" content="Igneous Rock Gallery" />
        <meta property="twitter:description" content="A collection of images of different igneous rocks based on origin and composition." />
        <meta property="twitter:image" content="https://gallery.adityabdev.com/Gallery.jpg" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
