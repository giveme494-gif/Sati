import { useEffect, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

const GENERATED_WEB_ICON = "/manus-storage/async-images/8iUTEigHcOtuqG7jIhd9Fc/image-1.webp";

export const palette = {
  background: "#F6F3EB",
  card: "#FFFEFA",
  primary: "#24574A",
  primaryDark: "#173E35",
  text: "#243D35",
  muted: "#71847B",
  border: "#E2E5DB",
  sage: "#E4EBE1",
  sageDark: "#CEDBCF",
  amber: "#C9943D",
  amberSoft: "#F6EBD5",
  white: "#FFFFFF",
  lightText: "#EAF1EB",
  redSoft: "#F6E5DD",
};

export function BrandMark({ size = 40, light = false }: { size?: number; light?: boolean }) {
  const stroke = light ? "#F6F3EB" : palette.primary;
  return (
    <View style={[styles.brandMark, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size * 0.72} height={size * 0.72} viewBox="0 0 48 48">
        <Circle cx="24" cy="24" r="21" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
        <Path d="M24 35V23M24 29c-7 0-11-4-11-10 6 0 10 3 11 10Zm0-2c7 0 11-4 11-10-6 0-10 3-11 10Zm0-5c-4-4-3-9 0-13 4 4 4 9 0 13Z" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M18 36h12" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export function PageShell({
  children,
  scroll = true,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.pageContent, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.pageContent, styles.flexContent, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function AppHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.header}>
      {Platform.OS === "web" ? (
        <Image
          accessibilityLabel="Sati"
          source={{ uri: GENERATED_WEB_ICON }}
          resizeMode="cover"
          style={styles.generatedBrandMark}
        />
      ) : (
        <BrandMark size={44} />
      )}
      <View style={styles.headerCopy}>
        <Text style={styles.brandName}>Sati</Text>
        <Text style={styles.headerSubtitle}>{subtitle ?? "တရားထိုင် ကိုယ်ဟန်လမ်းညွှန်"}</Text>
      </View>
    </View>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.pageTitleWrap}>
      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function SurfaceCard({
  children,
  style,
  dark = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
}) {
  return <View style={[styles.card, dark && styles.darkCard, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.82}
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, disabled && styles.disabledButton, style]}
    >
      {icon}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.82}
      disabled={disabled}
      onPress={onPress}
      style={[styles.secondaryButton, disabled && styles.disabledButton, style]}
    >
      {icon}
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function PrivacyPill({ dark = false }: { dark?: boolean }) {
  return (
    <View style={[styles.privacyPill, dark && styles.privacyPillDark]}>
      <View style={[styles.privacyDot, dark && styles.privacyDotDark]} />
      <Text style={[styles.privacyText, dark && styles.privacyTextDark]}>ဒေတာကို ဖုန်းပေါ်တွင်သာ စစ်ဆေးသည်</Text>
    </View>
  );
}

export function StatusBadge({
  label,
  tone = "green",
}: {
  label: string;
  tone?: "green" | "amber" | "neutral";
}) {
  return (
    <View style={[styles.statusBadge, tone === "amber" && styles.statusAmber, tone === "neutral" && styles.statusNeutral]}>
      <Text style={[styles.statusText, tone === "amber" && styles.statusAmberText, tone === "neutral" && styles.statusNeutralText]}>{label}</Text>
    </View>
  );
}

export function BreathRing({
  label = "အသက်ရှူ",
  value = "တည်ငြိမ်",
  size = 164,
}: {
  label?: string;
  value?: string;
  size?: number;
}) {
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 3200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 3200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0.82] });
  return (
    <View style={[styles.breathRingWrap, { width: size, height: size }]}>
      <Animated.View style={[styles.breathRingOuter, { transform: [{ scale }], opacity, width: size, height: size, borderRadius: size / 2 }]} />
      <View style={[styles.breathRingInner, { width: size * 0.76, height: size * 0.76, borderRadius: size }]}>
        <Text style={styles.breathLabel}>{label}</Text>
        <Text style={styles.breathValue}>{value}</Text>
      </View>
    </View>
  );
}

export function BodyText({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.bodyText, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  scroll: { flex: 1 },
  pageContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30, gap: 20 },
  flexContent: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerCopy: { flex: 1, gap: 1 },
  generatedBrandMark: { width: 44, height: 44, borderRadius: 22, overflow: "hidden", backgroundColor: palette.primary },
  brandMark: { alignItems: "center", justifyContent: "center", backgroundColor: palette.sage },
  brandName: { color: palette.primaryDark, fontSize: 23, fontWeight: "700", letterSpacing: 0.4 },
  headerSubtitle: { color: palette.muted, fontSize: 13 },
  pageTitleWrap: { gap: 4 },
  pageTitle: { color: palette.text, fontSize: 25, lineHeight: 34, fontWeight: "700" },
  pageSubtitle: { color: palette.muted, fontSize: 14, lineHeight: 22 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionTitle: { color: palette.text, fontSize: 17, lineHeight: 25, fontWeight: "700" },
  card: { borderRadius: 22, backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, padding: 18, gap: 12 },
  darkCard: { backgroundColor: palette.primary, borderColor: palette.primary },
  primaryButton: { minHeight: 54, borderRadius: 17, paddingHorizontal: 20, backgroundColor: palette.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  primaryButtonText: { color: palette.white, fontSize: 16, fontWeight: "700" },
  secondaryButton: { minHeight: 50, borderRadius: 16, paddingHorizontal: 18, backgroundColor: palette.sage, borderWidth: 1, borderColor: palette.sageDark, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  secondaryButtonText: { color: palette.primaryDark, fontSize: 15, fontWeight: "700" },
  disabledButton: { opacity: 0.48 },
  privacyPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: palette.sage },
  privacyPillDark: { backgroundColor: "rgba(255,255,255,0.12)" },
  privacyDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: palette.primary },
  privacyDotDark: { backgroundColor: "#D8E9D8" },
  privacyText: { color: palette.primary, fontSize: 11, fontWeight: "600" },
  privacyTextDark: { color: "#F0F5EC" },
  statusBadge: { alignSelf: "flex-start", borderRadius: 15, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#E7F0E8" },
  statusText: { color: palette.primary, fontSize: 12, fontWeight: "700" },
  statusAmber: { backgroundColor: palette.amberSoft },
  statusAmberText: { color: "#805816" },
  statusNeutral: { backgroundColor: "#ECEFEA" },
  statusNeutralText: { color: palette.muted },
  breathRingWrap: { alignItems: "center", justifyContent: "center", alignSelf: "center" },
  breathRingOuter: { position: "absolute", borderWidth: 1, borderColor: palette.sageDark, backgroundColor: "rgba(228,235,225,0.24)" },
  breathRingInner: { alignItems: "center", justifyContent: "center", backgroundColor: palette.sage },
  breathLabel: { color: palette.muted, fontSize: 13 },
  breathValue: { color: palette.primary, fontSize: 19, lineHeight: 29, fontWeight: "700", marginTop: 3 },
  bodyText: { color: palette.text, fontSize: 14, lineHeight: 23 },
});
