import { useCallback, useEffect, useRef, useState } from "react";
import { CameraView } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { analyzeLocalFrame, isLocalVisionAvailable } from "@/lib/vision/native-detector";
import type { FrameObservation } from "@/lib/vision/types";

interface UsePostureCameraOptions {
  active: boolean;
  intervalMs?: number;
  onFrame: (frame: FrameObservation) => void;
}

export function usePostureCamera({
  active,
  intervalMs = 1400,
  onFrame,
}: UsePostureCameraOptions) {
  const cameraRef = useRef<CameraView>(null);
  const callbackRef = useRef(onFrame);
  const inFlightRef = useRef(false);
  const cleanupBlockedRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFrameAt, setLastFrameAt] = useState<number | null>(null);
  const supported = Platform.OS === "android" && isLocalVisionAvailable();

  useEffect(() => {
    callbackRef.current = onFrame;
  }, [onFrame]);

  const setCameraRef = useCallback((camera: CameraView | null) => {
    cameraRef.current = camera;
  }, []);

  const onCameraReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  useEffect(() => {
    if (!active || !cameraReady || !supported) return;
    let alive = true;

    const captureAndAnalyze = async () => {
      if (!alive || cleanupBlockedRef.current || inFlightRef.current || !cameraRef.current) return;
      inFlightRef.current = true;
      let temporaryUri: string | null = null;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.55,
          exif: false,
          shutterSound: false,
          skipProcessing: false,
        });
        temporaryUri = photo.uri;
        const frame = await analyzeLocalFrame(photo.uri);
        if (!alive) return;
        setError(null);
        setLastFrameAt(frame.timestamp);
        callbackRef.current(frame);
      } catch (captureError) {
        if (alive) {
          const message = captureError instanceof Error ? captureError.message : "ကင်မရာပုံကို စစ်ဆေး၍ မရပါ။";
          setError(message);
        }
      } finally {
        if (temporaryUri) {
          try {
            await FileSystem.deleteAsync(temporaryUri, { idempotent: true });
          } catch {
            cleanupBlockedRef.current = true;
            if (alive) {
              setError("ယာယီကင်မရာပုံကို ဖုန်းထဲမှ ဖျက်၍မရပါ။ ကိုယ်ရေးလုံခြုံမှုအတွက် စစ်ဆေးမှုကို ရပ်ထားသည်။");
            }
          }
        }
        inFlightRef.current = false;
      }
    };

    void captureAndAnalyze();
    const timer = setInterval(() => void captureAndAnalyze(), intervalMs);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [active, cameraReady, intervalMs, supported]);

  return {
    setCameraRef,
    cameraReady,
    onCameraReady,
    error,
    lastFrameAt,
    supported,
  };
}
