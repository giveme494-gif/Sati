import { describe, expect, it } from "vitest";
import {
  calculateBaseline,
  compareFrameObservation,
  PostureEventTracker,
} from "../lib/vision/rules";
import type { FaceObservation, FrameObservation, PoseObservation } from "../lib/vision/types";

const baseFace: FaceObservation = {
  yaw: 0,
  pitch: 0,
  roll: 0,
  leftEyeOpenProbability: 0.95,
  rightEyeOpenProbability: 0.95,
  confidence: 0.95,
};

function makeFrame(
  timestamp: number,
  options: {
    face?: Partial<FaceObservation> | null;
    shoulderY?: number;
    shoulderCenterX?: number;
    noseX?: number;
    poseConfidence?: number;
    landmarkConfidence?: number;
  } = {},
): FrameObservation {
  const landmarkConfidence = options.landmarkConfidence ?? 0.95;
  const shoulderCenterX = options.shoulderCenterX ?? 0.5;
  const pose: PoseObservation = {
    confidence: options.poseConfidence ?? 0.95,
    landmarks: {
      nose: { x: options.noseX ?? 0.5, y: 0.35, confidence: landmarkConfidence },
      leftShoulder: { x: shoulderCenterX - 0.15, y: options.shoulderY ?? 0.65, confidence: landmarkConfidence },
      rightShoulder: { x: shoulderCenterX + 0.15, y: options.shoulderY ?? 0.65, confidence: landmarkConfidence },
    },
  };
  return {
    timestamp,
    face: options.face === null ? null : { ...baseFace, ...options.face },
    pose,
  };
}

function makeBaseline() {
  const baseline = calculateBaseline([makeFrame(0), makeFrame(100)]);
  if (!baseline) throw new Error("Test fixture calibration failed");
  return baseline;
}

describe("posture rules", () => {
  it("aggregates valid multi-frame observations into a normalized baseline", () => {
    const a = makeFrame(0, { face: { yaw: 2, pitch: 3, roll: -2 }, shoulderY: 0.64, noseX: 0.48 });
    const b = makeFrame(100, { face: { yaw: 4, pitch: 5, roll: 2 }, shoulderY: 0.66, noseX: 0.52 });
    const baseline = calculateBaseline([a, b]);

    expect(baseline).not.toBeNull();
    expect(baseline?.faceYaw).toBe(3);
    expect(baseline?.facePitch).toBe(4);
    expect(baseline?.faceRoll).toBe(0);
    expect(baseline?.eyeOpenProbability).toBeCloseTo(0.95);
    expect(baseline?.shoulderMidpointY).toBeCloseTo(0.65);
    expect(baseline?.noseAnchor.x).toBeCloseTo(0.5);
    expect(baseline?.bodyAnchor.x).toBeCloseTo(0.5);
    expect(baseline?.sampleCount).toBe(2);
    expect(calculateBaseline([a])).toBeNull();
  });

  it("detects raised shoulders, screen-right head tilt, forward pitch drop, and body shift", () => {
    const baseline = makeBaseline();
    const raised = compareFrameObservation(makeFrame(200, { shoulderY: 0.59 }), baseline);
    expect(raised.map((item) => item.type)).toContain("shoulders_raised");

    const rightTilt = compareFrameObservation(makeFrame(200, { face: { roll: 15 } }), baseline);
    expect(rightTilt.map((item) => item.type)).toContain("head_right");
    expect(rightTilt.map((item) => item.type)).not.toContain("head_left");

    const leftTilt = compareFrameObservation(makeFrame(200, { face: { roll: -15 } }), baseline);
    expect(leftTilt.map((item) => item.type)).toContain("head_left");

    const forwardDrop = compareFrameObservation(makeFrame(200, { face: { pitch: 18 } }), baseline);
    expect(forwardDrop.map((item) => item.type)).toContain("head_forward");

    const shifted = compareFrameObservation(makeFrame(200, { shoulderCenterX: 0.58 }), baseline);
    expect(shifted.map((item) => item.type)).toContain("body_shift");
  });

  it("does not turn low-confidence detections or landmarks into posture failures", () => {
    const baseline = makeBaseline();
    const lowConfidence = makeFrame(200, {
      face: { roll: 35, confidence: 0.2 },
      shoulderY: 0.5,
      poseConfidence: 0.2,
    });
    expect(compareFrameObservation(lowConfidence, baseline)).toEqual([]);

    const poorLandmarks = makeFrame(201, { shoulderY: 0.5, landmarkConfidence: 0.1 });
    expect(compareFrameObservation(poorLandmarks, baseline)).toEqual([]);
  });

  it("estimates likely eye closure only from reduced open probability and supports disabling that check", () => {
    const baseline = makeBaseline();
    const closedLike = makeFrame(200, {
      face: { leftEyeOpenProbability: 0.1, rightEyeOpenProbability: 0.12 },
    });
    expect(compareFrameObservation(closedLike, baseline).map((item) => item.type)).toContain("eyes_closed");
    expect(compareFrameObservation(closedLike, baseline, "balanced", { eyesCheckEnabled: false })
      .map((item) => item.type)).not.toContain("eyes_closed");
  });

  it("reports explicit missing observations but ignores a present low-confidence face", () => {
    const baseline = makeBaseline();
    const missing = makeFrame(200, { face: null });
    missing.pose = null;
    expect(compareFrameObservation(missing, baseline).map((item) => item.type)).toEqual([
      "face_missing", "body_missing",
    ]);
  });

  it("debounces issue starts, closes events, and enforces per-issue cooldown", () => {
    const tracker = new PostureEventTracker(500, 2_000);
    const raised = [{ type: "shoulders_raised" as const, severity: "low" as const, confidence: 0.9 }];
    expect(tracker.update(raised, 0)).toEqual([]);
    const started = tracker.update(raised, 500);
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ status: "started", startTimestamp: 0, endTimestamp: null });

    const ended = tracker.update([], 1_000);
    expect(ended).toHaveLength(1);
    expect(ended[0]).toMatchObject({ status: "ended", startTimestamp: 0, endTimestamp: 1_000, durationMs: 1_000 });

    expect(tracker.update(raised, 1_500)).toEqual([]);
    expect(tracker.update(raised, 2_000)).toEqual([]);
    const afterCooldown = tracker.update(raised, 3_000);
    expect(afterCooldown).toHaveLength(1);
    expect(afterCooldown[0]).toMatchObject({ status: "started", startTimestamp: 1_500 });
  });
});
