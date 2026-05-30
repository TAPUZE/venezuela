"use client";

import { createTheme } from "@mantine/core";

/**
 * 2026 brutalist / ultra-minimalist theme.
 * High-contrast monochrome. No purple/magenta, no glowing orbs, no oval header pills.
 * The premium feel comes from kinetic feedback (Framer Motion), not color.
 */
export const theme = createTheme({
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  fontFamilyMonospace: "ui-monospace, SFMono-Regular, Menlo, monospace",
  defaultRadius: 0,
  white: "#ffffff",
  black: "#0a0a0a",
  primaryColor: "dark",
  colors: {
    dark: [
      "#f5f5f5",
      "#e0e0e0",
      "#c2c2c2",
      "#9e9e9e",
      "#757575",
      "#4a4a4a",
      "#2e2e2e",
      "#1a1a1a",
      "#111111",
      "#0a0a0a",
    ],
  },
  components: {
    Button: {
      defaultProps: { radius: 0 },
      styles: {
        root: { fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase" as const },
      },
    },
    Paper: { defaultProps: { radius: 0, withBorder: true } },
    Card: { defaultProps: { radius: 0, withBorder: true } },
  },
});
