import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Crane Spotting",
    short_name: "Crane Spotting",
    description: "Look up. Spot cranes. Climb the Crane Spotting leaderboard.",
    start_url: "/",
    display: "standalone",
    background_color: "#a9edf1",
    theme_color: "#fff04a",
    icons: [
      { src: "/crane-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/crane-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/crane-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}