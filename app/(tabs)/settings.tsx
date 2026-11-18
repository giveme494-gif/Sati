import { useCallback, useState } from "react";
import { Alert, Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { AppHeader, PageShell, PageTitle, PrimaryButton, SectionHeading, SurfaceCard, palette } from "@/components/sati-ui";
import { DEFAULT_SETTINGS, sessionStore } from "@/lib/storage/session-store";
import type { Settings, Sensitivity } from "@/lib/vision/types";
import { useVoicePrompts } from "@/hooks/use-voice-prompts";

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const { playPrompt } = useVoicePrompts();
  useFocusEffect(
    useCallback(() => {
      let active = true;
      sessionStore.readSettings().then((value) => { if (active) setSettings(value); });
      return () => { active = false; };
    }, []),
  );

  const update = async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await sessionStore.writeSettings(next);
  };
  const confirm = (title: string, message: string, action: () => Promise<void>) => {
    const run = () => { void action(); };
    if (Platform.OS === "web") {
      if (typeof globalThis.confirm === "function" && globalThis.confirm(`${title}\n\n${message}`)) run();
      return;
    }
    Alert.alert(title, message, [
      { text: "မလုပ်တော့ပါ", style: "cancel" },
      { text: "ဖျက်မည်", style: "destructive", onPress: run },
    ]);
  };

  return (
    <PageShell>
      <AppHeader />
      <PageTitle title="ကိုယ်ပိုင်ချိန်ညှိမှု" subtitle="သတိပေးချက်ကို မိမိနဲ့ သင့်တော်သလို ပြင်ဆင်ပါ။" />

      <SurfaceCard style={styles.settingCard}>
        <SectionHeading title="အာရုံခံနိုင်မှု" />
        <Text style={styles.helper}>ပြောင်းလဲမှုနည်းနည်းကို သိစေချင်လျှင် ပိုမိုသိသာသောအဆင့်ကို ရွေးပါ။</Text>
        <View style={styles.segmentRow}>
          {([
            ["gentle", "နူးညံ့"],
            ["balanced", "ပုံမှန်"],
            ["sensitive", "ပိုသိသာ"],
          ] as [Sensitivity, string][]).map(([value, label]) => (
            <TouchableOpacity key={value} onPress={() => void update({ sensitivity: value })} style={[styles.segment, settings.sensitivity === value && styles.segmentSelected]}>
              <Text style={[styles.segmentText, settings.sensitivity === value && styles.segmentTextSelected]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.settingCard}>
        <SectionHeading title="သတိပေးမည့်အချိန်" />
        <Text style={styles.helper}>ခဏတာ လှုပ်ရှားမှုအတွက် အသံမပေးပါ။</Text>
        <View style={styles.delayRow}>
          {[3, 5, 10].map((seconds) => (
            <TouchableOpacity key={seconds} onPress={() => void update({ reminderDelaySeconds: seconds })} style={[styles.delayChoice, settings.reminderDelaySeconds === seconds && styles.delaySelected]}>
              <Text style={[styles.delayNumber, settings.reminderDelaySeconds === seconds && styles.delaySelectedText]}>{seconds}</Text>
              <Text style={[styles.delayUnit, settings.reminderDelaySeconds === seconds && styles.delaySelectedText]}>စက္ကန့်</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.toggleCard}>
        <View style={styles.toggleCopy}>
          <Text style={styles.toggleTitle}>မြန်မာအသံ သတိပေးချက်</Text>
          <Text style={styles.helper}>အသံဖိုင်များကို ဖုန်းထဲတွင် ကြိုတင်ထည့်ထားသည်။</Text>
        </View>
        <Switch value={settings.voiceEnabled} onValueChange={(value) => void update({ voiceEnabled: value })} trackColor={{ false: "#D6D9D1", true: "#9AB9A7" }} thumbColor={settings.voiceEnabled ? palette.primary : "#FAFAF7"} />
        <TouchableOpacity accessibilityRole="button" style={styles.testVoice} onPress={() => playPrompt("shoulders_raised")}>
          <MaterialIcons name="volume-up" size={18} color={palette.primary} />
          <Text style={styles.testVoiceText}>အသံ စမ်းနားထောင်ရန်</Text>
        </TouchableOpacity>
      </SurfaceCard>

      <SurfaceCard style={styles.toggleCard}>
        <View style={styles.toggleCopy}>
          <Text style={styles.toggleTitle}>မျက်လုံးအခြေအနေ စစ်ဆေးမှု</Text>
          <Text style={styles.helper}>ဖွင့်/ပိတ်ဖြစ်နိုင်ခြေကိုသာ ခန့်မှန်းသည်။ တင်းတင်းပိတ်ထားမှုကို မတိုင်းတာနိုင်ပါ။</Text>
        </View>
        <Switch value={settings.eyesCheckEnabled} onValueChange={(value) => void update({ eyesCheckEnabled: value })} trackColor={{ false: "#D6D9D1", true: "#9AB9A7" }} thumbColor={settings.eyesCheckEnabled ? palette.primary : "#FAFAF7"} />
        <View style={styles.note}><MaterialIcons name="info-outline" size={17} color={palette.amber} /><Text style={styles.noteText}>မူလကိုယ်ဟန်ချိန်ရာတွင် မျက်လုံးအနေအထားကို သက်သောင့်သက်သာရှိသလို ရွေးချယ်နိုင်သည်။</Text></View>
      </SurfaceCard>

      <SurfaceCard style={styles.privacyCard}>
        <View style={styles.privacyHeader}><MaterialIcons name="lock" size={20} color={palette.primary} /><Text style={styles.toggleTitle}>ကိုယ်ရေးအချက်အလက်</Text></View>
        <Text style={styles.helper}>ကင်မရာပုံကို စစ်ပြီးတာနဲ့ ဖျက်သည်။ ကိုယ်ဟန်ဖြစ်ရပ်၊ အချိန်နဲ့ တရားထိုင်မှတ်တမ်းအကျဉ်းချုပ်ကိုသာ ဖုန်းထဲမှာ သိမ်းသည်။ အကောင့် သို့မဟုတ် cloud သို့ မပို့ပါ။</Text>
        <TouchableOpacity style={styles.deleteRow} onPress={() => confirm("မှတ်တမ်းဖျက်မည်", "ဒီဖုန်းထဲရှိ တရားထိုင်မှတ်တမ်းအားလုံးကို ဖျက်မည်။", () => sessionStore.clearHistory())}>
          <MaterialIcons name="delete-outline" size={20} color="#9B5443" /><Text style={styles.deleteText}>တရားထိုင်မှတ်တမ်းအားလုံး ဖျက်ရန်</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteRow} onPress={() => confirm("မူလကိုယ်ဟန်ဖျက်မည်", "သိမ်းထားသော ကိုယ်ဟန်ချိန်ညှိချက်ကို ဖျက်မည်။", async () => { await sessionStore.clearCalibration(); router.replace("/calibration"); })}>
          <MaterialIcons name="restart-alt" size={20} color="#9B5443" /><Text style={styles.deleteText}>မူလကိုယ်ဟန် ဖျက်ပြီး ပြန်ချိန်ရန်</Text>
        </TouchableOpacity>
      </SurfaceCard>

      <PrimaryButton label="ကိုယ်ဟန် ပြန်ချိန်ညှိရန်" icon={<MaterialIcons name="center-focus-strong" size={20} color={palette.white} />} onPress={() => router.push("/calibration")} />
      <Text style={styles.version}>Sati · စက်တွင်း ကိုယ်ဟန်လမ်းညွှန်</Text>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  settingCard: { gap: 13 },
  helper: { color: palette.muted, fontSize: 12, lineHeight: 20 },
  segmentRow: { flexDirection: "row", backgroundColor: "#F0F1EA", borderRadius: 15, padding: 4, gap: 3 },
  segment: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 42, borderRadius: 12 },
  segmentSelected: { backgroundColor: palette.primary },
  segmentText: { color: palette.muted, fontSize: 12, fontWeight: "600" },
  segmentTextSelected: { color: palette.white },
  delayRow: { flexDirection: "row", gap: 9 },
  delayChoice: { flex: 1, borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingVertical: 10, alignItems: "center", gap: 1 },
  delaySelected: { backgroundColor: palette.primary, borderColor: palette.primary },
  delayNumber: { color: palette.text, fontSize: 17, fontWeight: "700" },
  delayUnit: { color: palette.muted, fontSize: 10 },
  delaySelectedText: { color: palette.white },
  toggleCard: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 },
  toggleCopy: { flex: 1, minWidth: 205, gap: 4 },
  toggleTitle: { color: palette.text, fontSize: 14, lineHeight: 21, fontWeight: "700" },
  testVoice: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  testVoiceText: { color: palette.primary, fontSize: 12, fontWeight: "700" },
  note: { flexDirection: "row", gap: 7, alignItems: "flex-start", backgroundColor: palette.amberSoft, padding: 10, borderRadius: 12 },
  noteText: { flex: 1, color: "#795617", fontSize: 11, lineHeight: 18 },
  privacyCard: { gap: 14 },
  privacyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  deleteRow: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 12 },
  deleteText: { color: "#925440", fontSize: 12, fontWeight: "700" },
  version: { textAlign: "center", color: palette.muted, fontSize: 11, paddingBottom: 5 },
});
