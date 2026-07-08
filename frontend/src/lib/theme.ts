// Centsible design tokens — dark, GenZ, electric cyan + wealth gold.
export const theme = {
  colors: {
    bg: "#0A0B10",
    surface: "#171923",
    surfaceElevated: "#2D3748",
    glass: "rgba(23, 25, 35, 0.7)",

    // Primary: electric cyan — trading terminal / crypto-native feel
    primary: "#06B6D4",
    primaryGlow: "rgba(6, 182, 212, 0.28)",
    primarySoft: "rgba(6, 182, 212, 0.12)",
    primaryBorder: "rgba(6, 182, 212, 0.35)",

    // AI accent — subtle purple, unchanged (works with cyan)
    ai: "#8B5CF6",
    aiGlow: "rgba(139, 92, 246, 0.28)",
    aiSoft: "rgba(139, 92, 246, 0.10)",
    aiBorder: "rgba(139, 92, 246, 0.30)",

    // Premium / Pro / Wealth — amber gold
    gold: "#FBBF24",
    goldSoft: "rgba(251, 191, 36, 0.12)",
    goldBorder: "rgba(251, 191, 36, 0.35)",
    goldDeep: "#B45309",

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
