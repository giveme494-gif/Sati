import { useCallback, useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import {
  AppHeader,
  BreathRing,
  PageShell,
  PrimaryButton,
  PrivacyPill,
  SectionHeading,
  StatusBadge,
  SurfaceCard,
  palette,
} from "@/components/sati-ui";
import { sessionStore, type SessionMetadata } from "@/lib/storage/session-store";

export default function HomeScreen() {
  const router = useRouter();
  const [hasBaseline, setHasBaseline] = useState(false);
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      Promise.all([sessionStore.readCalibration(), sessionStore.listSessions()]).then(([baseline, history]) => {
        if (!mounted) return;
        setHasBaseline(!!baseline);
        setSessions(history);
        setLoaded(true);
      });
      return () => {
        mounted = false;
      };
    }, []),
  );

  const latest = sessions[0];
  return (
    <PageShell>
      <AppHeader />

      <View style={styles.welcome}>
        <Text style={styles.welcomeTitle}>အေးဆေးစွာ ထိုင်ပါ။</Text>
        <Text style={styles.welcomeText}>ကိုယ့်ရဲ့ သက်သောင့်သက်သာရှိတဲ့ ကိုယ်ဟန်ကို သတ်မှတ်ပြီး တိတ်တဆိတ် စောင့်ကြည့်ပါ။</Text>
      </View>

      <SurfaceCard dark style={styles.heroCard}>
        <View style={styles.heroTop}>
          <StatusBadge label="ဖုန်းထဲတွင်သာ" tone="green" />
          <MaterialIcons name="self-improvement" size={24} color="#E6EFE6" />
        </View>
        <Text style={styles.heroTitle}>ကိုယ်ဟန်အတွက် နူးညံ့သော သတိပေးချက်</Text>
        <Text style={styles.heroDescription}>မျက်နှာ၊ ခေါင်း၊ ပခုံးနှင့် ကိုယ်ခန္ဓာကို သင့်သတ်မှတ်ထားသော မူလအနေအထားနဲ့ နှိုင်းယှဉ်ပေးမည်။</Text>
        <PrivacyPill dark />
      </SurfaceCard>

      <SurfaceCard style={styles.baselineCard}>
        <View style={styles.baselineIcon}>
          <MaterialIcons name={hasBaseline ? "check-circle" : "center-focus-strong"} size={25} color={palette.primary} />
        </View>
        <View style={styles.baselineCopy}>
          <Text style={styles.cardHeading}>{hasBaseline ? "မူလကိုယ်ဟန် သတ်မှတ်ပြီးပါပြီ" : "မူလကိုယ်ဟန်ကို အရင်သတ်မှတ်ပါ"}</Text>
          <Text style={styles.cardBody}>{hasBaseline ? "ကိုယ်ဟန်တည်နေရာကို လိုအပ်သည့်အခါ ပြန်ချိန်ညှိနိုင်သည်။" : "ထိုင်ပုံကို ကိုယ်တိုင် အတည်ပြုပြီးမှ စောင့်ကြည့်မှု စတင်မည်။"}</Text>
        </View>
        {hasBaseline ? <StatusBadge label="သိမ်းပြီး" /> : null}
      </SurfaceCard>

      <View style={styles.startBlock}>
        <BreathRing size={150} label="ယခုအခြေအနေ" value={hasBaseline ? "အေးဆေး" : "ပြင်ဆင်ရန်"} />
        <PrimaryButton
          label={hasBaseline ? "တရားထိုင်မှု စတင်ရန်" : "မူလကိုယ်ဟန် သတ်မှတ်ရန်"}
          icon={<MaterialIcons name="arrow-forward" size={20} color={palette.white} />}
          onPress={() => router.push(hasBaseline ? "/session" : "/calibration")}
          disabled={!loaded}
          style={styles.startButton}
        />
        {hasBaseline ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/calibration")} style={styles.recalibrate}>
            <Text style={styles.recalibrateText}>ကိုယ်ဟန်ကို ပြန်ချိန်ညှိရန်</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.featureSection}>
        <SectionHeading title="စောင့်ကြည့်ပေးမည့် အချက်များ" />
        <View style={styles.featureRow}>
          <Feature icon="face" label="မျက်နှာ" detail="စောင်းခြင်း၊ လှည့်ခြင်း" />
          <Feature icon="accessibility-new" label="ခေါင်းနှင့် ပခုံး" detail="ငိုက်ခြင်း၊ ပင့်ခြင်း" />
          <Feature icon="accessibility" label="ကိုယ်ခန္ဓာ" detail="အနေအထားရွေ့ခြင်း" />
        </View>
      </View>

      {latest ? (
        <SurfaceCard style={styles.lastSession}>
          <SectionHeading title="နောက်ဆုံးထိုင်မှု" action={<Text style={styles.score}>{latest.stableScore}%</Text>} />
          <Text style={styles.cardBody}>{Math.round(latest.totalSeconds / 60)} မိနစ် · {latest.events.filter((event) => event.status === "started").length} ကြိမ် သတိပေးခဲ့သည်</Text>
        </SurfaceCard>
      ) : null}

      <Text style={styles.disclaimer}>ဤ app သည် ကိုယ်ဟန်သတိပေးအကူအညီသာဖြစ်ပြီး ဆေးဘက်ဆိုင်ရာ အကဲဖြတ်မှု မဟုတ်ပါ။</Text>
    </PageShell>
  );
}

function Feature({ icon, label, detail }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; detail: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}><MaterialIcons name={icon} size={22} color={palette.primary} /></View>
      <Text style={styles.featureLabel}>{label}</Text>
      <Text style={styles.featureDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  welcome: { gap: 5, paddingTop: 2 },
  welcomeTitle: { color: palette.text, fontSize: 26, lineHeight: 35, fontWeight: "700" },
  welcomeText: { color: palette.muted, fontSize: 14, lineHeight: 23 },
  heroCard: { padding: 20, gap: 13, overflow: "hidden" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroTitle: { color: "#F4F6EF", fontSize: 20, lineHeight: 29, fontWeight: "700", maxWidth: 280 },
  heroDescription: { color: "#D6E2D9", fontSize: 13, lineHeight: 22 },
  baselineCard: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15 },
  baselineIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: palette.sage, alignItems: "center", justifyContent: "center" },
  baselineCopy: { flex: 1, gap: 4 },
  cardHeading: { color: palette.text, fontSize: 14, lineHeight: 21, fontWeight: "700" },
  cardBody: { color: palette.muted, fontSize: 12, lineHeight: 19 },
  startBlock: { alignItems: "center", gap: 16, paddingVertical: 2 },
  startButton: { width: "100%" },
  recalibrate: { paddingVertical: 3 },
  recalibrateText: { color: palette.primary, fontSize: 13, fontWeight: "600" },
  featureSection: { gap: 12 },
  featureRow: { flexDirection: "row", gap: 9 },
  feature: { flex: 1, minHeight: 111, paddingVertical: 12, paddingHorizontal: 9, borderRadius: 18, backgroundColor: "#EEEFE7", alignItems: "center", gap: 5 },
  featureIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: palette.card, alignItems: "center", justifyContent: "center" },
  featureLabel: { color: palette.text, fontSize: 12, lineHeight: 18, fontWeight: "700", textAlign: "center" },
  featureDetail: { color: palette.muted, fontSize: 10, lineHeight: 15, textAlign: "center" },
  lastSession: { gap: 8 },
  score: { color: palette.primary, fontSize: 20, fontWeight: "700" },
  disclaimer: { color: palette.muted, fontSize: 11, lineHeight: 18, textAlign: "center", paddingHorizontal: 8 },
});
