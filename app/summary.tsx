import { useEffect, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, BreathRing, PageShell, PrimaryButton, SecondaryButton, SurfaceCard, palette } from "@/components/sati-ui";
import { sessionStore, type SessionMetadata } from "@/lib/storage/session-store";
import { formatClock, formatDuration, ISSUE_LABELS } from "@/lib/vision/labels";

export default function SummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionMetadata | null>(null);
  useEffect(() => {
    let active = true;
    sessionStore.listSessions().then((items) => {
      const match = items.find((item) => item.id === id);
      if (active) setSession(match ?? null);
    });
    return () => { active = false; };
  }, [id]);
  const events = session?.events.filter((event) => event.status === "started") ?? [];

  return (
    <PageShell>
      <AppHeader />
      <View style={styles.hero}>
        <View style={styles.doneIcon}><MaterialIcons name="check" size={28} color={palette.primary} /></View>
        <Text style={styles.title}>ဒီနေ့အတွက် ကောင်းမွန်စွာ ထိုင်ပြီးပါပြီ</Text>
        <Text style={styles.subtitle}>{session ? formatClock(session.startTimestamp) : "သင့်ရဲ့ session အကျဉ်းချုပ်"}</Text>
        <BreathRing size={150} label="တည်ငြိမ်မှု" value={session ? `${session.stableScore}%` : "—"} />
      </View>

      <View style={styles.metrics}>
        <SurfaceCard style={styles.metricCard}><Text style={styles.metricLabel}>ထိုင်ခဲ့သည့်အချိန်</Text><Text style={styles.metricValue}>{session ? formatDuration(session.totalSeconds) : "—"}</Text></SurfaceCard>
        <SurfaceCard style={styles.metricCard}><Text style={styles.metricLabel}>သတိပေးချက်</Text><Text style={styles.metricValue}>{events.length} ကြိမ်</Text></SurfaceCard>
      </View>

      <SurfaceCard style={styles.eventCard}>
        <Text style={styles.eventTitle}>ကိုယ်ဟန်ဖြစ်ရပ်များ</Text>
        {events.length === 0 ? <Text style={styles.noEvents}>သတ်မှတ်ထားသည့် ကိုယ်ဟန်မှ အချိန်ကြာပြောင်းလဲမှု မတွေ့ခဲ့ပါ။</Text> : events.map((event, index) => (
          <View key={`${event.startTimestamp}-${index}`} style={styles.eventRow}>
            <View style={styles.eventDot} />
            <View style={styles.eventCopy}><Text style={styles.eventName}>{ISSUE_LABELS[event.issue.type]}</Text><Text style={styles.eventTime}>{formatClock(event.startTimestamp)}</Text></View>
          </View>
        ))}
        <Text style={styles.localNote}>မှတ်တမ်းကို ဒီဖုန်းထဲမှာသာ သိမ်းထားသည်။</Text>
      </SurfaceCard>

      <PrimaryButton label="နောက်တစ်ကြိမ် တရားထိုင်ရန်" icon={<MaterialIcons name="replay" size={19} color={palette.white} />} onPress={() => router.replace("/session")} />
      <SecondaryButton label="မှတ်တမ်းများကို ကြည့်ရန်" icon={<MaterialIcons name="history" size={19} color={palette.primary} />} onPress={() => router.replace("/(tabs)/history")} />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 8, paddingTop: 2 },
  doneIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: palette.sage, alignItems: "center", justifyContent: "center" },
  title: { color: palette.text, fontSize: 20, fontWeight: "700", textAlign: "center", lineHeight: 29 },
  subtitle: { color: palette.muted, fontSize: 12 },
  metrics: { flexDirection: "row", gap: 11 },
  metricCard: { flex: 1, gap: 5, paddingVertical: 14 },
  metricLabel: { color: palette.muted, fontSize: 11 },
  metricValue: { color: palette.primary, fontSize: 16, fontWeight: "700" },
  eventCard: { gap: 12 },
  eventTitle: { color: palette.text, fontSize: 15, fontWeight: "700" },
  noEvents: { color: palette.muted, fontSize: 12, lineHeight: 20 },
  eventRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.amber, marginTop: 5 },
  eventCopy: { flex: 1, gap: 2 },
  eventName: { color: palette.text, fontSize: 12, fontWeight: "600" },
  eventTime: { color: palette.muted, fontSize: 10 },
  localNote: { color: palette.primary, fontSize: 10, borderTopColor: palette.border, borderTopWidth: 1, paddingTop: 9 },
});
