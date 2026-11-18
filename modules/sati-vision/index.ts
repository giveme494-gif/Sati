import { requireOptionalNativeModule } from "expo-modules-core";

export type NativeLandmark = {
  x: number;
  y: number;
  confidence: number;
};

export type NativeFaceObservation = {
  yaw: number;
  pitch: number;
  roll: number;
  leftEyeOpenProbability: number | null;
  rightEyeOpenProbability: number | null;
  confidence: number;
};

export type NativePoseObservation = {
  landmarks: Record<string, NativeLandmark>;
  confidence: number;
};

export type NativeFrameObservation = {
  timestamp: number;
  face: NativeFaceObservation | null;
  pose: NativePoseObservation | null;
};

type SatiVisionNativeModule = {
  analyzeImage(uri: string): Promise<NativeFrameObservation>;
  capabilities(): {
    faceDetection: boolean;
    poseDetection: boolean;
    processing: "on-device";
  };
};

/** Null in Expo Go, web preview, and builds that have not included the Android native module. */
export const SatiVision = requireOptionalNativeModule<SatiVisionNativeModule>("SatiVision");
