import { SatiVision } from "@/modules/sati-vision";
import type { FrameObservation } from "./types";

export const isLocalVisionAvailable = (): boolean => SatiVision !== null;

/** Analyze a temporary camera photo entirely on-device; no image bytes leave this call. */
export async function analyzeLocalFrame(uri: string): Promise<FrameObservation> {
  if (!SatiVision) {
    throw new Error("စက်တွင်း ကိုယ်ဟန်စစ်ဆေးမှုကို Android အထူး build တွင်သာ အသုံးပြုနိုင်ပါသည်။");
  }
  const frame = await SatiVision.analyzeImage(uri);
  return {
    timestamp: frame.timestamp,
    face: frame.face
      ? {
          yaw: frame.face.yaw,
          pitch: frame.face.pitch,
          roll: frame.face.roll,
          leftEyeOpenProbability: frame.face.leftEyeOpenProbability,
          rightEyeOpenProbability: frame.face.rightEyeOpenProbability,
          confidence: frame.face.confidence,
        }
      : null,
    pose: frame.pose
      ? {
          confidence: frame.pose.confidence,
          landmarks: frame.pose.landmarks,
        }
      : null,
  };
}
