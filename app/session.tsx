import { useCallback, useEffect, useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PageShell, PrivacyPill, PrimaryButton, SecondaryButton, SurfaceCard, StatusBadge, palette } from "@/components/sati-ui";
import { usePostureCamera } from "@/hooks/use-posture-camera";
import { usePostureNotifications } from "@/hooks/use-posture-notifications";
import { useVoicePrompts } from "@/hooks/use-voice-prompts";
import { sessionStore, type SessionMetadata } from "@/lib/storage/session-store";
import { ISSUE_CORRECTIONS, ISSUE_LABELS, formatDuration } from "@/lib/vision/labels";
import { compareFrameObservation, PostureEventTracker } from "@/lib/vision/rules";
import type { CalibrationBaseline, FrameObservation, PostureIssue, PostureIssueEvent, Settings } from "@/lib/vision/types";

export default function SessionScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [baseline, setBaseline] = useState<CalibrationBaseline | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [detectedIssues, setDetectedIssues] = useState<PostureIssue[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const baselineRef = useRef<CalibrationBaseline | null>(null);
  const settingsRef = useRef<Settings | null>(null);
  const trackerRef = useRef<PostureEventTracker | null>(null);
  const runningRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const segmentStartRef = useRef(0);
  const elapsedBeforeRef = useRef(0);
  const elapsedSecondsRef = useRef(0);
  const eventsRef = useRef<PostureIssueEvent[]>([]);
  const frameCountRef = useRef(0);
  const cleanFrameCountRef = useRef(0);
  const { playPrompt } = useVoicePrompts();
  const { notifyIssue, clearNotifications } = usePostureNotifications(true);
  const onFrame = useCallback((frame: FrameObservation) => {
    const currentBaseline = baselineRef.current;
    const currentSettings = settingsRef.current;
    const tracker = trackerRef.current;
    if (!currentBaseline || !currentSettings || !tracker || !runningRef.current) return;

    const issues = compareFrameObservation(frame, currentBaseline, currentSettings.sensitivity, {
      eyesCheckEnabled: currentSettings.eyesCheckEnabled,
    });
    frameCountRef.current += 1;
    if (issues.length === 0) cleanFrameCountRef.current += 1;
    setDetectedIssues(issues);

    const transitions = tracker.update(issues, frame.timestamp);
    if (transitions.length === 0) return;
    const nextEvents = [...eventsRef.current, ...transitions];
    eventsRef.current = nextEvents;
    setEventCount(nextEvents.filter((event) => event.status === "started").length);
    const id = sessionIdRef.current;
    const startedAt = startTimestampRef.current;
    if (id && startedAt) {
      const total = elapsedSecondsRef.current;
      const stable = frameCountRef.current > 0
        ? Math.round((cleanFrameCountRef.current / frameCountRef.current) * 100)
        : 100;
      const openSession: SessionMetadata = {
        id,
        startTimestamp: startedAt,
        endTimestamp: null,
        totalSeconds: total,
        events: nextEvents,
        goodSeconds: Math.round((total * stable) / 100),
        stableScore: stable,
      };
      void sessionStore.appendSession(openSession);
    }
    for (const transition of transitions) {
      if (transition.status === "started" &&
        transition.issue.type !== "face_missing" && transition.issue.type !== "body_missing") {
        if (currentSettings.voiceEnabled) playPrompt(transition.issue.type);
        // Visible banner + vibration even when the voice is muted.
        void notifyIssue(transition.issue.type);
      }
    }
  }, [playPrompt, notifyIssue]);

  const {
    setCameraRef,
    cameraReady,
    onCameraReady,
    error: cameraMonitorError,
    lastFrameAt,
    supported,
  } = usePostureCamera({ active: running && permission?.granted === true, onFrame });
  useKeepAwake(running ? "sati-meditation-session" : undefined);

  useEffect(() => {
    let alive = true;
    Promise.all([sessionStore.readCalibration(), sessionStore.readSettings()]).then(([savedBaseline, savedSettings]) => {
      if (!alive) return;
      setBaseline(savedBaseline);
      baselineRef.current = savedBaseline;
      setSettings(savedSettings);
      settingsRef.current = savedSettings;
      setLoaded(true);
      if (!savedBaseline) router.replace("/calibration");
    });
    return () => { alive = false; };
  }, [router]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const current = Math.floor((elapsedBeforeRef.current + Date.now() - segmentStartRef.current) / 1000);
      elapsedSecondsRef.current = current;
      setElapsedSeconds(current);
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const beginSession = async () => {
    if (!baseline || !settings || !permission?.granted || !supported) return;
    const now = Date.now();
    const id = `sati-${now}-${Math.random().toString(36).slice(2, 7)}`;
    sessionIdRef.current = id;
    startTimestampRef.current = now;
    eventsRef.current = [];
    frameCountRef.current = 0;
    cleanFrameCountRef.current = 0;
    elapsedBeforeRef.current = 0;
    elapsedSecondsRef.current = 0;
    segmentStartRef.current = now;
    trackerRef.current = new PostureEventTracker(settings.reminderDelaySeconds * 1000, settings.cooldownSeconds * 1000);
    setElapsedSeconds(0);
    setEventCount(0);
    setDetectedIssues([]);
    setCameraError(null);
    const record: SessionMetadata = {
      id,
      startTimestamp: now,
      endTimestamp: null,
      totalSeconds: 0,
      events: [],
      goodSeconds: 0,
      stableScore: 100,
    };
    try {
      await sessionStore.appendSession(record);
      runningRef.current = true;
      setRunning(true);
      setHasSession(true);
    } catch {
      setCameraError("တရားထိုင်မှတ်တမ်းကို ဖုန်းထဲတွင် မသိမ်းနိုင်ပါ။");
    }
  };

  const pauseSession = () => {
    const now = Date.now();
    elapsedBeforeRef.current += Math.max(0, now - segmentStartRef.current);
    elapsedSecondsRef.current = Math.floor(elapsedBeforeRef.current / 1000);
    setElapsedSeconds(elapsedSecondsRef.current);
    const endingEvents = trackerRef.current?.finish(now) ?? [];
    if (endingEvents.length) {
      const next = [...eventsRef.current, ...endingEvents];
      eventsRef.current = next;
      const id = sessionIdRef.current;
      const startedAt = startTimestampRef.current;
      if (id && startedAt) {
        void sessionStore.appendSession({
          id, startTimestamp: startedAt, endTimestamp: null, totalSeconds: elapsedSecondsRef.current,
          events: next, goodSeconds: 0, stableScore: 100,
        });
      }
    }
    runningRef.current = false;
    trackerRef.current = null;
    setRunning(false);
    void clearNotifications();
  };

  const resumeSession = () => {
    const currentSettings = settingsRef.current;
    if (!currentSettings) return;
    trackerRef.current = new PostureEventTracker(currentSettings.reminderDelaySeconds * 1000, currentSettings.cooldownSeconds * 1000);
    segmentStartRef.current = Date.now();
    runningRef.current = true;
    setRunning(true);
  };

  const finishSession = async () => {
    const id = sessionIdRef.current;
    const startedAt = startTimestampRef.current;
    if (!id || !startedAt) {
      router.back();
      return;
    }
    const now = Date.now();
    const totalMs = elapsedBeforeRef.current + (runningRef.current ? Math.max(0, now - segmentStartRef.current) : 0);
    const totalSeconds = Math.floor(totalMs / 1000);
    const endingEvents = trackerRef.current?.finish(now) ?? [];
    const finalEvents = [...eventsRef.current, ...endingEvents];
    eventsRef.current = finalEvents;
    const stableScore = frameCountRef.current > 0
      ? Math.round((cleanFrameCountRef.current / frameCountRef.current) * 100)
      : 100;
    const goodSeconds = Math.round(totalSeconds * stableScore / 100);
    runningRef.current = false;
    trackerRef.current = null;
    setRunning(false);
    void clearNotifications();
    try {
      await sessionStore.finishSession(id, {
        endTimestamp: now,
        totalSeconds,
        events: finalEvents,
        goodSeconds,
        stableScore,
      });
    } catch {
      setCameraError("တရားထိုင်ချိန် ပြီးဆုံးသွားသော်လည်း အကျဉ်းချုပ်ကို သိမ်းဆည်း၍မရပါ။");
      return;
    }
    router.replace(`/summary?id=${encodeURIComponent(id)}`);
  };

  const timerLabel = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const primaryIssue = detectedIssues.find((issue) => issue.type !== "face_missing" && issue.type !== "body_missing");
  const missingObservation = detectedIssues.find((issue) => issue.type === "face_missing" || issue.type === "body_missing");

  if (!loaded || !settings) {
    return <PageShell scroll={false} contentStyle={styles.loading}><ActivityIndicator color={palette.primary} /><Text style={styles.statusText}>ကိုယ်ဟန်ချိန်ညှိချက်ကို ဖတ်နေသည်…</Text></PageShell>;
  }

  return (
    <PageShell scroll={false} contentStyle={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" onPress={() => running ? void finishSession() : router.back()} style={styles.backButton}>
          <MaterialIcons name="close" size={22} color={palette.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}><Text style={styles.headerTitle}>တိတ်ဆိတ်စွာ တရားထိုင်ချိန်</Text><Text style={styles.timer}>{timerLabel}</Text></View>
        <TouchableOpacity accessibilityRole="button" onPress={() => {
          const next = { ...settings, voiceEnabled: !settings.voiceEnabled };
          setSettings(next);
          settingsRef.current = next;
          void sessionStore.writeSettings(next);
        }} style={styles.voiceButton}>
          <MaterialIcons name={settings.voiceEnabled ? "volume-up" : "volume-off"} size={22} color={palette.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.cameraFrame}>
        {permission?.granted ? (
          <CameraView ref={setCameraRef} style={styles.camera} facing="front" mode="picture" onCameraReady={onCameraReady} />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <MaterialIcons name="camera-alt" size={38} color="#D8E5D8" />
            <Text style={styles.placeholderText}>ကင်မရာခွင့်ပြုချက် လိုအပ်သည်</Text>
            <TouchableOpacity onPress={() => void requestPermission()} style={styles.permissionLink}><Text style={styles.permissionLinkText}>ခွင့်ပြုရန် နှိပ်ပါ</Text></TouchableOpacity>
          </View>
        )}
        {permission?.granted && supported ? (
          <View pointerEvents="none" style={styles.cameraOverlay}>
            <View style={styles.topPill}><View style={[styles.liveDot, running && styles.liveDotActive]} /><Text style={styles.topPillText}>{running ? "စက်တွင်း စောင့်ကြည့်နေသည်" : "စတင်ရန် အသင့်ဖြစ်သည်"}</Text></View>
            <View style={styles.personGuide}><MaterialIcons name="accessibility-new" size={80} color="rgba(255,255,255,0.58)" /><Text style={styles.frameHint}>မျက်နှာ၊ ပခုံးနှင့် ကိုယ်ဟန်ကို အတွင်းတွင်ထားပါ</Text></View>
          </View>
        ) : null}
        {!supported ? <View style={styles.buildOverlay}><MaterialIcons name="phone-android" size={23} color={palette.white} /><Text style={styles.buildText}>အစမ်းကြည့်ရှုမှုတွင် ကိုယ်ဟန်စစ်ဆေးမှု အလုပ်မလုပ်ပါ။ Android အထူး build ထဲတွင် စက်တွင်း ML Kit မော်ဂျူး လိုအပ်သည်။</Text></View> : null}
      </View>

      <SurfaceCard style={styles.statusCard}>
        <View style={styles.statusHead}>
          <StatusBadge label={running ? "စောင့်ကြည့်နေသည်" : "ခဏနားထားသည်"} tone={running ? "green" : "neutral"} />
          <Text style={styles.alertCounter}>{eventCount} သတိပေးချက်</Text>
        </View>
        {primaryIssue ? (
          <View style={styles.issueWrap}>
            <View style={styles.issueIcon}><MaterialIcons name="self-improvement" size={22} color={palette.amber} /></View>
            <View style={styles.issueCopy}><Text style={styles.issueTitle}>{ISSUE_CORRECTIONS[primaryIssue.type]}</Text><Text style={styles.issueDescription}>{ISSUE_LABELS[primaryIssue.type]} · အနေအထားကို သိမ်းထားသော မူလကိုယ်ဟန်နှင့် နှိုင်းယှဉ်တွေ့ရှိသည်</Text></View>
          </View>
        ) : missingObservation ? (
          <View style={styles.issueWrap}><View style={styles.issueIcon}><MaterialIcons name="center-focus-strong" size={22} color={palette.muted} /></View><View style={styles.issueCopy}><Text style={styles.issueTitle}>မြင်ကွင်းကို စစ်ဆေးပါ</Text><Text style={styles.issueDescription}>{ISSUE_CORRECTIONS[missingObservation.type]}</Text></View></View>
        ) : (
          <View style={styles.issueWrap}><View style={styles.issueIcon}><MaterialIcons name={running ? "spa" : "pause-circle-outline"} size={22} color={palette.primary} /></View><View style={styles.issueCopy}><Text style={styles.issueTitle}>{running ? lastFrameAt ? "ကိုယ်ဟန် တည်ငြိမ်နေသည်" : "စစ်ဆေးမှု စတင်နေသည်" : "ဆက်လက်ရန် အသင့်"}</Text><Text style={styles.issueDescription}>{running ? "ပြောင်းလဲမှု ဆက်ရှိမှသာ နူးညံ့စွာ သတိပေးမည်။" : "ကင်မရာကို ဆက်ဖွင့်မည့်အချိန်ကို သင်ထိန်းချုပ်နိုင်သည်။"}</Text></View></View>
        )}
        <PrivacyPill />
      </SurfaceCard>

      {cameraError ? <Text style={styles.errorText}>{cameraError}</Text> : null}
      {cameraMonitorError ? <Text style={styles.errorText}>{cameraMonitorError}</Text> : null}

      <View style={styles.controls}>
        {!supported ? (
          <SecondaryButton label="ပင်မစာမျက်နှာသို့ ပြန်ရန်" onPress={() => router.replace("/")} />
        ) : !permission?.granted ? (
          <PrimaryButton label="ကင်မရာခွင့်ပြုရန်" icon={<MaterialIcons name="camera-alt" size={19} color={palette.white} />} onPress={() => void requestPermission()} />
        ) : !running && !hasSession ? (
          <PrimaryButton label="တရားထိုင်မှု စတင်ရန်" icon={<MaterialIcons name="play-arrow" size={23} color={palette.white} />} onPress={() => void beginSession()} disabled={!cameraReady} />
        ) : running ? (
          <View style={styles.buttonRow}>
            <SecondaryButton label="ခဏရပ်ရန်" icon={<MaterialIcons name="pause" size={19} color={palette.primary} />} onPress={pauseSession} style={styles.halfButton} />
            <PrimaryButton label="ပြီးဆုံးရန်" icon={<MaterialIcons name="stop" size={19} color={palette.white} />} onPress={() => void finishSession()} style={styles.halfButton} />
          </View>
        ) : (
          <View style={styles.buttonRow}>
            <SecondaryButton label="ဆက်လက်ရန်" icon={<MaterialIcons name="play-arrow" size={19} color={palette.primary} />} onPress={resumeSession} style={styles.halfButton} />
            <PrimaryButton label="ပြီးဆုံးရန်" icon={<MaterialIcons name="stop" size={19} color={palette.white} />} onPress={() => void finishSession()} style={styles.halfButton} />
          </View>
        )}
        <Text style={styles.sessionNote}>{running ? "ကင်မရာပုံကို စစ်ဆေးပြီးနောက် ယာယီဖိုင်ကို ဖျက်မည်။" : `ယခုကြာချိန်: ${formatDuration(elapsedSeconds)}`}</Text>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 5, paddingBottom: 8, gap: 10 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  statusText: { color: palette.muted, fontSize: 13 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.sage, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 1 },
  headerTitle: { color: palette.text, fontSize: 14, fontWeight: "700" },
  timer: { color: palette.primary, fontSize: 20, fontWeight: "700", letterSpacing: 1 },
  voiceButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.sage, alignItems: "center", justifyContent: "center" },
  cameraFrame: { flex: 1, minHeight: 180, borderRadius: 23, backgroundColor: "#1D332B", overflow: "hidden", position: "relative" },
  camera: { flex: 1 },
  cameraPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 11, padding: 22 },
  placeholderText: { color: palette.white, fontSize: 14, fontWeight: "700", textAlign: "center" },
  permissionLink: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.16)" },
  permissionLinkText: { color: palette.white, fontSize: 12, fontWeight: "700" },
  cameraOverlay: { ...StyleSheet.absoluteFill, justifyContent: "space-between", padding: 12 },
  topPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "rgba(24,43,35,0.78)" },
  topPillText: { color: palette.white, fontSize: 10, fontWeight: "600" },
  liveDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: palette.amber },
  liveDotActive: { backgroundColor: "#8FBF93" },
  personGuide: { flex: 1, justifyContent: "center", alignItems: "center", gap: 2 },
  frameHint: { color: palette.white, fontSize: 10, fontWeight: "600", backgroundColor: "rgba(24,43,35,0.68)", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  buildOverlay: { position: "absolute", left: 9, right: 9, bottom: 9, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(36,87,74,0.96)", borderRadius: 14, padding: 10 },
  buildText: { color: palette.white, fontSize: 10, lineHeight: 16, flex: 1 },
  statusCard: { padding: 13, gap: 10 },
  statusHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertCounter: { color: palette.muted, fontSize: 11, fontWeight: "600" },
  issueWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  issueIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: palette.sage, alignItems: "center", justifyContent: "center" },
  issueCopy: { flex: 1, gap: 3 },
  issueTitle: { color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  issueDescription: { color: palette.muted, fontSize: 10, lineHeight: 16 },
  errorText: { color: "#925440", fontSize: 10, lineHeight: 16 },
  controls: { gap: 7 },
  buttonRow: { flexDirection: "row", gap: 9 },
  halfButton: { flex: 1, minHeight: 48 },
  sessionNote: { color: palette.muted, fontSize: 10, textAlign: "center" },
});
