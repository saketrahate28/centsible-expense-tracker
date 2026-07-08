import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet, Text, Platform } from "react-native";
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Circle, Path, G } from "react-native-svg";
import { theme } from "@/src/lib/theme";

type Props = { size?: number };

/**
 * 3D-looking rotating Indian Rupee coin.
 * Uses rotateY transform to simulate a metallic flip.
 * The width is scaled by |cos(angle)| so the coin appears to face-flip.
 */
export default function RupeeCoin3D({ size = 180 }: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 3600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
    return () => spin.stopAnimation();
  }, [spin]);

  // Full 360° rotation on Y axis for the 3D flip
  const rotateY = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Scale X to simulate perspective (thinner when edge-on)
  const scaleX = spin.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.15, 1, 0.15, 1],
  });

  // Slight vertical bob for extra life
  const translateY = spin.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -6, 0],
  });

  return (
    <View style={[styles.wrap, { width: size + 40, height: size + 40 }]}>
      <View style={[styles.glow, { width: size * 1.4, height: size * 1.4, borderRadius: size }]} />
      <Animated.View
        style={{
          transform: [
            { translateY },
            { perspective: 800 },
            { rotateY },
            { scaleX },
          ],
        }}
      >
        <CoinFace size={size} />
      </Animated.View>
    </View>
  );
}

function CoinFace({ size }: { size: number }) {
  const r = size / 2;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id="metal" cx="35%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#FEF3C7" />
          <Stop offset="35%" stopColor="#FBBF24" />
          <Stop offset="75%" stopColor="#D97706" />
          <Stop offset="100%" stopColor="#78350F" />
        </RadialGradient>
        <LinearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FEF3C7" />
          <Stop offset="100%" stopColor="#92400E" />
        </LinearGradient>
        <RadialGradient id="shine" cx="30%" cy="25%" r="30%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Outer rim */}
      <Circle cx="100" cy="100" r="98" fill="url(#rim)" />
      {/* Coin body */}
      <Circle cx="100" cy="100" r="90" fill="url(#metal)" />
      {/* Inner ring */}
      <Circle cx="100" cy="100" r="82" fill="none" stroke="#78350F" strokeWidth="1.5" strokeOpacity="0.4" />
      <Circle cx="100" cy="100" r="86" fill="none" stroke="#FEF3C7" strokeWidth="1" strokeOpacity="0.5" />

      {/* Rupee symbol ₹ hand-drawn — bold, GenZ */}
      <G transform="translate(100 100)">
        {/* Top horizontal */}
        <Path
          d="M -32 -34 L 34 -34 L 34 -26 L -32 -26 Z"
          fill="#78350F"
          fillOpacity="0.95"
        />
        {/* Second horizontal (slanted) */}
        <Path
          d="M -32 -20 L 34 -20 L 34 -12 L -32 -12 Z"
          fill="#78350F"
          fillOpacity="0.95"
        />
        {/* Vertical stem with curve */}
        <Path
          d="M -18 -34
             L -10 -34
             L -10 6
             L 22 42
             L 10 42
             L -22 6
             L -22 -2
             L -14 -2
             C 4 -2 12 -6 12 -14
             C 12 -20 6 -22 -2 -22
             L -18 -22 Z"
          fill="#78350F"
          fillOpacity="0.95"
        />
      </G>

      {/* Star dots around the coin (like real Indian rupee coin) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const cx = 100 + Math.cos(angle) * 76;
        const cy = 100 + Math.sin(angle) * 76;
        return <Circle key={i} cx={cx} cy={cy} r={1.5} fill="#78350F" fillOpacity="0.4" />;
      })}

      {/* Highlight shine */}
      <Circle cx="100" cy="100" r="90" fill="url(#shine)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    backgroundColor: "rgba(251,191,36,0.15)",
    ...Platform.select({
      web: { filter: "blur(40px)" as any },
      default: {},
    }),
    shadowColor: theme.colors.gold,
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
});
