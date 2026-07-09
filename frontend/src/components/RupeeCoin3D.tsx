import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet, Platform } from "react-native";
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Circle, Path, G } from "react-native-svg";
import { theme } from "@/src/lib/theme";

type Props = { size?: number };

/**
 * 3D-looking rotating ₹1 silver coin.
 * Silver metallic gradient with a chunky, embossed ₹ mark and dotted rim.
 */
export default function RupeeCoin3D({ size = 200 }: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
    return () => spin.stopAnimation();
  }, [spin]);

  const rotateY = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const scaleX = spin.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.12, 1, 0.12, 1],
  });
  const translateY = spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -8, 0] });

  return (
    <View style={[styles.wrap, { width: size + 40, height: size + 40 }]}>
      <View style={[styles.glow, { width: size * 1.5, height: size * 1.5, borderRadius: size }]} />
      <Animated.View
        style={{
          transform: [
            { translateY },
            { perspective: 900 },
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
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        {/* Silver metal gradient */}
        <RadialGradient id="silver" cx="35%" cy="30%" r="75%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="25%" stopColor="#F1F5F9" />
          <Stop offset="55%" stopColor="#94A3B8" />
          <Stop offset="90%" stopColor="#334155" />
          <Stop offset="100%" stopColor="#0F172A" />
        </RadialGradient>
        <LinearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#F8FAFC" />
          <Stop offset="50%" stopColor="#94A3B8" />
          <Stop offset="100%" stopColor="#1E293B" />
        </LinearGradient>
        {/* Bright top-left specular highlight */}
        <RadialGradient id="shine" cx="30%" cy="22%" r="35%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
        {/* Bottom-right subtle glow for depth */}
        <RadialGradient id="depth" cx="70%" cy="80%" r="45%">
          <Stop offset="0%" stopColor="#0F172A" stopOpacity="0.5" />
          <Stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
        </RadialGradient>

        {/* Bold rupee — deep engraved shadow gradient */}
        <LinearGradient id="rupeeInk" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#0F172A" />
          <Stop offset="100%" stopColor="#334155" />
        </LinearGradient>
      </Defs>

      {/* Outer rim */}
      <Circle cx="100" cy="100" r="98" fill="url(#rim)" />
      {/* Coin body */}
      <Circle cx="100" cy="100" r="90" fill="url(#silver)" />
      {/* Rim inner ring */}
      <Circle cx="100" cy="100" r="82" fill="none" stroke="#0F172A" strokeWidth="1.5" strokeOpacity="0.35" />
      <Circle cx="100" cy="100" r="86" fill="none" stroke="#F8FAFC" strokeWidth="1" strokeOpacity="0.55" />

      {/* Bold ₹ rupee — thicker strokes, harder shadow */}
      <G transform="translate(100 100)">
        {/* Top horizontal bar (thicker) */}
        <Path
          d="M -38 -42 L 40 -42 L 40 -30 L -38 -30 Z"
          fill="url(#rupeeInk)"
        />
        {/* Second horizontal bar (thicker) */}
        <Path
          d="M -38 -22 L 40 -22 L 40 -10 L -38 -10 Z"
          fill="url(#rupeeInk)"
        />
        {/* Vertical stem with curve (bolder) */}
        <Path
          d="M -22 -42
             L -8 -42
             L -8 6
             L 30 50
             L 12 50
             L -26 6
             L -26 -4
             L -14 -4
             C 8 -4 18 -10 18 -18
             C 18 -26 8 -30 -6 -30
             L -22 -30 Z"
          fill="url(#rupeeInk)"
        />
        {/* Highlight glint on the rupee */}
        <Path
          d="M -38 -42 L 40 -42 L 40 -40 L -38 -40 Z"
          fill="#F8FAFC"
          fillOpacity="0.4"
        />
      </G>

      {/* Dot border like real Indian coin */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const cx = 100 + Math.cos(angle) * 78;
        const cy = 100 + Math.sin(angle) * 78;
        return <Circle key={i} cx={cx} cy={cy} r={1.4} fill="#0F172A" fillOpacity="0.5" />;
      })}

      {/* Depth + highlight layers */}
      <Circle cx="100" cy="100" r="90" fill="url(#depth)" />
      <Circle cx="100" cy="100" r="90" fill="url(#shine)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  glow: {
    position: "absolute",
    backgroundColor: "rgba(148, 163, 184, 0.18)",
    ...Platform.select({
      web: { filter: "blur(50px)" as any },
      default: {},
    }),
    shadowColor: "#CBD5E1",
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
});
