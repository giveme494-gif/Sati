import { useCallback, useMemo, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PageShell, PrimaryButton, SecondaryButton, SurfaceCard, palette, PrivacyPill } from "@/components/sati-ui";
import { usePostureCamera } from "@/hooks/use-posture-camera";
import { sessionStore } from "@/lib/storage/session-store";
import { calculateBaseline } from "@/lib/vision/rules";
import { isLocalVisionAvailable } from "@/lib/vision/native-detector";
import type { FrameObservation } from "@/lib/vision/types";

export default function CalibrationScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [frames, setFrames] = useState<FrameObservation[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const visionAvailable = isLocalVisionAvailable();

  const onFrame = useCallback((frame: FrameObservation) => {
    setFrames((previous) => [...previous.slice(-11), frame]);
  }, []);
  const { setCameraRef, onCameraReady, error: cameraMonitorError, lastFrameAt } = usePostureCamera({
    active: permission?.granted === true && visionAvailable,
    onFrame,
  });
  const baseline = useMemo(() => calculateBaseline(frames, { minSamples: 4 }), [frames]);
  const usableSamples = baseline?.sampleCount ?? 0;

  const saveBaseline = async () => {
    if (!baseline) return;
    setSaving(true);
    setSaveError(null);
    try {
      await sessionStore.writeCalibration(baseline);
      router.replace("/session");
    } catch {
      setSaveError("ကိုယ်ဟန်ကို ဖုန်းထဲတွင် သိမ်း၍မရပါ။ ထပ်ကြိုးစားပါ။");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell scroll={false} contentStyle={styles.page}>
      <View style={styles.topLine}>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={22} color={palette.primary} />
        </TouchableOpacity>
        <View style={styles.heading}><Text style={styles.step}>အဆင့် ၁ · မူလကိုယ်ဟန်</Text><Text style={styles.title}>သက်သောင့်သက်သာ ထိုင်ပါ</Text></View>
      </View>
      <Text style={styles.intro}>ကိုယ်ဟန်ကောင်းတယ်လို့ သင်ကိုယ်တိုင် အတည်ပြုပြီးမှ မူလအနေအထားအဖြစ် သိမ်းမည်။</Text>

      {permission?.granted && visionAvailable ? (
        <View style={styles.previewShell}>
          <CameraView ref={setCameraRef} style={styles.camera} facing="front" mode="picture" onCameraReady={onCameraReady} />
          <View pointerEvents="none" style={styles.frameGuide}>
            <MaterialIcons name="accessibility-new" size={100} color="rgba(255,255,255,0.68)" />
            <View style={styles.guidePill}><Text style={styles.guideText}>မျက်နှာနှင့် ကိုယ်ဟန်ကို အတွင်းတွင်ထားပါ</Text></View>
          </View>
          <View style={styles.previewStatus}><View style={[styles.liveDot, lastFrameAt !== null ? styles.liveDotOn : null]} /><Text style={styles.previewStatusText}>{lastFrameAt ? "စက်တွင်း စစ်ဆေးနေသည်" : "ကင်မရာအဆင်သင့်ဖြစ်ရန် စောင့်နေသည်"}</Text></View>
        </View>
      ) : (
        <SurfaceCard style={styles.infoCard}>
          <View style={styles.infoIcon}><MaterialIcons name={visionAvailable ? "camera-alt" : "phone-android"} size={26} color={palette.primary} /></View>
          <Text style={styles.infoTitle}>{visionAvailable ? "ကင်မရာခွင့်ပြုချက် လိုအပ်သည်" : "Android အထူး build လိုအပ်သည်"}</Text>
          <Text style={styles.infoText}>{visionAvailable ? "မျက်နှာနှင့် ကိုယ်ဟန်ကို ဖုန်းပေါ်မှာ စစ်ဆေးဖို့ ကင်မရာကို အသုံးပြုမည်။" : "Expo Go သို့မဟုတ် Web Preview တွင် native ကိုယ်ဟန်စစ်ဆေးမှု မပါဝင်ပါ။ ML Kit ပါဝင်သော Android build မှာသာ ဒီအဆင့်ကို ပြီးမြောက်နိုင်သည်။"}</Text>
          {visionAvailable && permission?.granted !== true ? <PrimaryButton label="ကင်မရာအသုံးပြုခွင့်ပေးရန်" icon={<MaterialIcons name="camera-alt" size={19} color={palette.white} />} onPress={() => void requestPermission()} /> : null}
        </SurfaceCard>
      )}

      <SurfaceCard style={styles.instructionCard}>
        <View style={styles.instructionHeader}><MaterialIcons name="center-focus-strong" size={21} color={palette.primary} /><Text style={styles.instructionTitle}>ဖုန်းကို မျက်နှာရှေ့တွင် တည်ငြိမ်စွာထားပါ</Text></View>
        <Text style={styles.instructionText}>ကိုယ်ဟန်တစ်ခုလုံးကို မြင်ရအောင် ထားပါ။ မျက်နှာ၊ ပခုံးနှင့် နှာခေါင်းအမှတ်များ ရှင်းလင်းစွာပေါ်ရမည်။ သင့်အနေအထားသက်သောင့်သက်သာဖြစ်လျှင် မိမိကိုယ်တိုင် အတည်ပြုပြီး သိမ်းပါ။</Text>
        <PrivacyPill />
      </SurfaceCard>

      <View style={styles.bottomArea}>
        <View style={styles.sampleRow}>
          <View style={styles.sampleIcon}><MaterialIcons name={baseline ? "check-circle" : "hourglass-empty"} size={20} color={baseline ? palette.primary : palette.muted} /></View>
          <View style={styles.sampleCopy}><Text style={styles.sampleTitle}>{baseline ? "မူလအနေအထား ရရှိပါပြီ" : `${usableSamples} / 4 စစ်ဆေးမှုအမှတ်`}</Text><Text style={styles.sampleSubtitle}>{baseline ? "အနေအထားကို ကြည့်ပြီး ဆက်လုပ်နိုင်သည်။" : "ကင်မရာကို ကြည့်ရင်း ခဏတည်ငြိမ်စွာထိုင်ပါ။"}</Text></View>
        </View>
        {cameraMonitorError ? <Text style={styles.errorText}>{cameraMonitorError}</Text> : null}
        {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
        <PrimaryButton label={saving ? "သိမ်းနေသည်…" : "ဒီကိုယ်ဟန်ကို အတည်ပြုသိမ်းရန်"} icon={<MaterialIcons name="check" size={20} color={palette.white} />} onPress={() => void saveBaseline()} disabled={!baseline || saving || cameraMonitorError !== null} />
        <SecondaryButton label="ပြန်သွားရန်" onPress={() => router.back()} />
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 6, paddingBottom: 14, gap: 12 },
  topLine: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: palette.sage, alignItems: "center", justifyContent: "center" },
  heading: { flex: 1, gap: 2 },
  step: { color: palette.primary, fontSize: 11, fontWeight: "700" },
  title: { color: palette.text, fontSize: 21, fontWeight: "700" },
  intro: { color: palette.muted, fontSize: 13, lineHeight: 20 },
  previewShell: { flex: 1, minHeight: 210, maxHeight: 390, borderRadius: 22, overflow: "hidden", backgroundColor: "#25352F" },
  camera: { flex: 1 },
  frameGuide: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: 4 },
  guidePill: { backgroundColor: "rgba(21,43,36,0.75)", paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18 },
  guideText: { color: palette.white, fontSize: 11, fontWeight: "600" },
  previewStatus: { position: "absolute", left: 12, top: 12, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(21,43,36,0.76)", paddingHorizontal: 11, paddingVertical: 7, borderRadius: 15 },
  previewStatusText: { color: palette.white, fontSize: 10, fontWeight: "600" },
  liveDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: "#D3A74F" },
  liveDotOn: { backgroundColor: "#93C49E" },
  infoCard: { alignItems: "center", padding: 20 },
  infoIcon: { width: 55, height: 55, borderRadius: 19, backgroundColor: palette.sage, alignItems: "center", justifyContent: "center" },
  infoTitle: { color: palette.text, fontSize: 17, fontWeight: "700", textAlign: "center" },
  infoText: { color: palette.muted, fontSize: 12, lineHeight: 21, textAlign: "center" },
  instructionCard: { padding: 14, gap: 8 },
  instructionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  instructionTitle: { color: palette.text, fontSize: 13, fontWeight: "700", flex: 1 },
  instructionText: { color: palette.muted, fontSize: 11, lineHeight: 18 },
  bottomArea: { gap: 8 },
  sampleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 2 },
  sampleIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: palette.sage, alignItems: "center", justifyContent: "center" },
  sampleCopy: { flex: 1, gap: 2 },
  sampleTitle: { color: palette.text, fontSize: 12, fontWeight: "700" },
  sampleSubtitle: { color: palette.muted, fontSize: 10 },
  errorText: { color: "#925440", fontSize: 11, lineHeight: 17 },
});
