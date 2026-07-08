// Centsible design tokens — dark, GenZ, high-contrast neon.
export const theme = {
  colors: {
    bg: "#0A0B10",
    surface: "#171923",
    surfaceElevated: "#2D3748",
    glass: "rgba(23, 25, 35, 0.7)",

    primary: "#EC4899",
    primaryGlow: "rgba(236, 72, 153, 0.25)",
    ai: "#8B5CF6",
    aiGlow: "rgba(139, 92, 246, 0.25)",

    success: "#10B981",
    danger: "#F43F5E",
    warning: "#FBBF24",
    info: "#3B82F6",

    text: "#F8FAFC",
    textSecondary: "#94A3B8",
    textDisabled: "#475569",
    inverse: "#0A0B10",

    borderSubtle: "rgba(255, 255, 255, 0.06)",
    borderStrong: "rgba(255, 255, 255, 0.15)",
  },
  radius: { sm: 8, md: 16, lg: 24, xl: 32, pill: 999 },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  font: {
    // Use system defaults — reliable in Expo Go without custom font loading.
    heading: undefined as string | undefined,
    body: undefined as string | undefined,
  },
} as const;

export const categoryColors: Record<string, string> = {
  "Food & Drinks": "#F97316",
  Groceries: "#22C55E",
  Transport: "#3B82F6",
  Shopping: "#EC4899",
  Bills: "#EAB308",
  Entertainment: "#A855F7",
  Health: "#EF4444",
  Travel: "#06B6D4",
  Other: "#94A3B8",
};

export const categoryIcons: Record<string, string> = {
  "Food & Drinks": "utensils",
  Groceries: "shopping-cart",
  Transport: "car",
  Shopping: "shopping-bag",
  Bills: "file-text",
  Entertainment: "film",
  Health: "heart",
  Travel: "plane",
  Other: "circle",
};
