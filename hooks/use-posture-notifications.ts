import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";

import { ISSUE_CORRECTIONS, ISSUE_LABELS } from "@/lib/vision/labels";
import type { PostureIssueType } from "@/lib/vision/types";

const CHANNEL_ID = "sati-posture-reminders";

// Show the heads-up banner even while Sati is in the foreground (the session screen).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Local-only reminders: a notification is created on this phone, nothing is sent to a server.
 * Voice prompts stay the primary cue; this adds a visible banner and a gentle vibration.
 */
export function usePostureNotifications(enabled: boolean) {
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS !== "android") return;
    let alive = true;
    (async () => {
      try {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: "ကိုယ်ဟန် သတိပေးချက်",
          importance: Notifications.AndroidImportance.HIGH,
          sound: null,
          vibrationPattern: [0, 180, 120, 180],
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
        const current = await Notifications.getPermissionsAsync();
        if (alive && !current.granted) await Notifications.requestPermissionsAsync();
      } catch {
        // Reminders are best-effort; voice prompts and on-screen guidance still work.
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  const notifyIssue = useCallback(async (issue: PostureIssueType) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    if (Platform.OS !== "android") return;
    try {
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) return;
      if (lastIdRef.current) {
        await Notifications.dismissNotificationAsync(lastIdRef.current).catch(() => {});
      }
      lastIdRef.current = await Notifications.scheduleNotificationAsync({
        content: {
          title: ISSUE_LABELS[issue],
          body: ISSUE_CORRECTIONS[issue],
        },
        trigger: { channelId: CHANNEL_ID },
      });
    } catch {
      // Never let a failed notification interrupt the meditation session.
    }
  }, []);

  const clearNotifications = useCallback(async () => {
    if (lastIdRef.current) {
      await Notifications.dismissNotificationAsync(lastIdRef.current).catch(() => {});
      lastIdRef.current = null;
    }
  }, []);

  return { notifyIssue, clearNotifications };
}
