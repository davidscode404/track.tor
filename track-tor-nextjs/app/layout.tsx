import type { Metadata } from "next";
import "mapbox-gl/dist/mapbox-gl.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "Fertilization Timing | UK",
  description: "Select a UK location, check rain and sun weather, and determine when to fertilize.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
