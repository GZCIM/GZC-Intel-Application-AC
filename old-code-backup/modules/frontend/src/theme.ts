// EXACT theme system from fx-client-reproduction (quantum theme) - your week of design work
export const theme = {
  name: "Trading Operations",
  primary: "#95BD78", // GZC Mid Green less bright (reference)
  secondary: "#95BD78CC", // GZC Mid Green less bright 80% opacity
  accent: "#95BD7866", // GZC Mid Green less bright 40% opacity
  background: "#0a0a0a",
  surface: "#1a1918", // Subtle brown undertone
  surfaceAlt: "#252321", // Warmer surface with brown/yellow hints
  text: "#f8f6f0E6", // Warmer off-white with 90% opacity
  textSecondary: "#c8c0b0CC", // Lighter warm gray with 80% opacity
  border: "#3a3632", // Subtle warm border
  success: "#A8CC88", // Softer green, harmonizes with warm palette
  danger: "#D69A82", // Warmer red with brown undertone
  warning: "#95BD7866", // GZC Mid Green less bright 40% opacity
  info: "#0288d1",
  gradient: "linear-gradient(135deg, #95BD78CC 0%, #95BD7866 100%)",
  gradientNonLinear: "linear-gradient(135deg, #95BD78CC 0%, #7FA060 35%, #6B8052 70%, #4A3E32 100%)",
  category: "trading",
  headerColor: "#8FB377", // Darker green for trading headers
  primaryHover: "#7FA060", // Darker variant of primary for hover states
  fontFamily: "Inter, system-ui, sans-serif",
  
  // Typography system
  typography: {
    // Headers
    h1: { fontSize: "18px", fontWeight: "600" },
    h2: { fontSize: "14px", fontWeight: "600" },
    h3: { fontSize: "12px", fontWeight: "500" },
    h4: { fontSize: "11px", fontWeight: "500" },
    
    // Body text
    body: { fontSize: "11px", fontWeight: "400" },
    bodySmall: { fontSize: "10px", fontWeight: "400" },
    bodyTiny: { fontSize: "9px", fontWeight: "400" },
    
    // Numeric displays
    numberLarge: { fontSize: "14px", fontWeight: "500" }, // For main metrics
    numberMedium: { fontSize: "12px", fontWeight: "500" }, // For secondary metrics
    numberSmall: { fontSize: "11px", fontWeight: "400" }, // For supporting numbers
    
    // UI elements
    label: { fontSize: "9px", fontWeight: "500", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
    button: { fontSize: "11px", fontWeight: "400" },
    tab: { fontSize: "11px", fontWeight: "400" },
    input: { fontSize: "10px", fontWeight: "400" }
  }
};

export type Theme = typeof theme;