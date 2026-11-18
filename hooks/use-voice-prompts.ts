import { useCallback } from "react";
import { useAudioPlayer } from "expo-audio";

import type { PostureIssueType } from "@/lib/vision/types";

type PromptKey = "turn-left" | "turn-right" | "head-up" | "shoulders" | "face-center" | "body-center" | "eyes-soft";

export function useVoicePrompts() {
  const turnLeft = useAudioPlayer(require("../assets/audio/head-left.wav"));
  const turnRight = useAudioPlayer(require("../assets/audio/head-right.wav"));
  const headUp = useAudioPlayer(require("../assets/audio/head-up.wav"));
  const relaxShoulders = useAudioPlayer(require("../assets/audio/shoulders-relax.wav"));
  const faceCenter = useAudioPlayer(require("../assets/audio/face-center.wav"));
  const bodyCenter = useAudioPlayer(require("../assets/audio/body-center.wav"));
  const softEyes = useAudioPlayer(require("../assets/audio/eyes-soft.wav"));

  const players = [turnLeft, turnRight, headUp, relaxShoulders, faceCenter, bodyCenter, softEyes];
  const playPlayer = useCallback((selected: (typeof players)[number]) => {
    for (const player of players) {
      if (player !== selected) player.pause();
    }
    selected.seekTo(0);
    selected.play();
  }, [turnLeft, turnRight, headUp, relaxShoulders, faceCenter, bodyCenter, softEyes]);

  const playPrompt = useCallback((issue: PostureIssueType) => {
    const byIssue: Partial<Record<PostureIssueType, (typeof players)[number]>> = {
      // A left deviation is corrected with a small move right, and vice versa.
      head_left: turnRight,
      head_right: turnLeft,
      head_forward: headUp,
      shoulders_raised: relaxShoulders,
      body_shift: bodyCenter,
      eyes_closed: softEyes,
    };
    const player = byIssue[issue];
    if (player) playPlayer(player);
  }, [turnLeft, turnRight, headUp, relaxShoulders, bodyCenter, softEyes, playPlayer]);

  const playCue = useCallback((key: PromptKey) => {
    const byKey: Record<PromptKey, (typeof players)[number]> = {
      "turn-left": turnLeft,
      "turn-right": turnRight,
      "head-up": headUp,
      shoulders: relaxShoulders,
      "face-center": faceCenter,
      "body-center": bodyCenter,
      "eyes-soft": softEyes,
    };
    playPlayer(byKey[key]);
  }, [turnLeft, turnRight, headUp, relaxShoulders, faceCenter, bodyCenter, softEyes, playPlayer]);

  return { playPrompt, playCue };
}
