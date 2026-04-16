import type { NextConfig } from "next";

const reservedTopLevelRoutes = [
  "booking",
  "dashboard",
  "event-types",
  "availability",
  "bookings",
  "landing",
  "api",
  "_next",
  "favicon.ico"
];

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: `/:username((?!${reservedTopLevelRoutes.join("|")}).+)/:event`,
        destination: "/booking/:username/:event"
      }
    ];
  }
};

export default nextConfig;
