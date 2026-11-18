import { useCallback, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, PageShell, PageTitle, SectionHeading, StatusBadge, SurfaceCard, palette } from "@/components/sati-ui";
import { sessionStore, type SessionMetadata } from "@/lib/storage/session-store";
import { formatClock, formatDuration, ISSUE_LABELS } from "@/lib/vision/labels";

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [loaded, setLoaded] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      sessionStore.listSessions().then((items) => {
        if (active) {
          setSessions([...items].sort((a, b) => b.startTimestamp - a.startTimestamp));
          setLoaded(true);
        }
      });
      return () => { active = false; };
    }, []),
  );

  return (
    <PageShell>
      <AppHeader />
      <PageTitle title="တရားထိုင်မှု မှတ်တမ်း" subtitle="စက်ထဲမှာသာ သိမ်းထားတဲ့ သင့်ရဲ့ session များ။" />
      {sessions.length === 0 ? (
        <SurfaceCard style={styles.empty}>
          <View style={styles.emptyIcon}><MaterialIcons name="history" size={28} color={palette.primary} /></View>
          <Text style={styles.emptyTitle}>{loaded ? "မှတ်တမ်း မရှိသေးပါ" : "မှတ်တမ်းကို ဖွင့်နေသည်"}</Text>
          <Text style={styles.emptyText}>ပထမဆုံး session ပြီးဆုံးသည့်အခါ အချိန်၊ ကြာချိန်နှင့် ကိုယ်ဟန်သတိပေးချက်များ ဒီမှာပေါ်လာမည်။</Text>
        </SurfaceCard>
      ) : (
        <View style={styles.list}>
          {sessions.map((session) => <SessionCard key={session.id} session={session} />)}
        </View>
      )}
    </PageShell>
  );
}

function SessionCard({ session }: { session: SessionMetadata }) {
  const started = session.events.filter((event) => event.status === "started");
  const endByStart = new Map(session.events.filter((event) => event.status === "ended").map((event) => [event.startTimestamp, event]));
  return (
    <SurfaceCard style={styles.sessionCard}>
      <View style={styles.sessionTop}>
        <View style={styles.timeIcon}><MaterialIcons name="self-improvement" size={22} color={palette.primary} /></View>
        <View style={styles.sessionCopy}>
          <Text style={styles.sessionDate}>{new Date(session.startTimestamp).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}</Text>
          <Text style={styles.sessionTime}>{formatClock(session.startTimestamp)} · {formatDuration(session.totalSeconds)}</Text>
        </View>
        <StatusBadge label={`${session.stableScore}%`} />
      </View>
      <View style={styles.scoreTrack}><View style={[styles.scoreFill, { width: `${Math.max(0, Math.min(100, session.stableScore))}%` }]} /></View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>တည်ငြိမ်စွာထိုင်ခဲ့သည်</Text>
        <Text style={styles.summaryValue}>{formatDuration(session.goodSeconds)}</Text>
      </View>
      {started.length > 0 ? (
        <View style={styles.eventList}>
          <SectionHeading title="ကိုယ်ဟန်သတိပေးချက်များ" />
          {started.map((event, index) => {
            const ended = endByStart.get(event.startTimestamp);
            const seconds = ended ? Math.round(ended.durationMs / 1000) : 0;
            return (
              <View key={`${event.startTimestamp}-${event.issue.type}-${index}`} style={styles.eventRow}>
                <View style={styles.eventDot} />
                <View style={styles.eventCopy}>
                  <Text style={styles.eventLabel}>{ISSUE_LABELS[event.issue.type]}</Text>
                  <Text style={styles.eventMeta}>{formatClock(event.startTimestamp)} · {seconds ? `${seconds} စက္ကန့်` : "ဆက်လက်ဖြစ်နေသည်"}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.noIssues}>ကိုယ်ဟန်ပြောင်းလဲမှု သတိပေးချက် မရှိခဲ့ပါ။</Text>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  empty: { alignItems: "center", paddingVertical: 30, paddingHorizontal: 24 },
  emptyIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: palette.sage, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: palette.text, fontSize: 18, fontWeight: "700", marginTop: 2 },
  emptyText: { color: palette.muted, fontSize: 13, lineHeight: 22, textAlign: "center" },
  sessionCard: { gap: 14 },
  sessionTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  timeIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: palette.sage, alignItems: "center", justifyContent: "center" },
  sessionCopy: { flex: 1, gap: 3 },
  sessionDate: { color: palette.text, fontSize: 15, fontWeight: "700" },
  sessionTime: { color: palette.muted, fontSize: 12 },
  scoreTrack: { height: 8, borderRadius: 8, overflow: "hidden", backgroundColor: "#E8EAE3" },
  scoreFill: { height: 8, backgroundColor: palette.primary, borderRadius: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryText: { color: palette.muted, fontSize: 12 },
  summaryValue: { color: palette.text, fontSize: 12, fontWeight: "700" },
  eventList: { gap: 10, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 13 },
  eventRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.amber, marginTop: 6 },
  eventCopy: { flex: 1, gap: 2 },
  eventLabel: { color: palette.text, fontSize: 13, fontWeight: "600" },
  eventMeta: { color: palette.muted, fontSize: 11 },
  noIssues: { color: palette.primary, fontSize: 13, paddingTop: 10, borderTopWidth: 1, borderTopColor: palette.border },
});
