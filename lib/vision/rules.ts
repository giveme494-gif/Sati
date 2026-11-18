import type {
  CalibrationBaseline,
  FaceObservation,
  FrameObservation,
  Landmark,
  PostureIssue,
  PostureIssueEvent,
  PostureIssueType,
  Sensitivity,
} from "./types";

const DEFAULT_MIN_CONFIDENCE = 0.55;
const DEFAULT_MIN_SAMPLES = 2;
const LANDMARK_CONFIDENCE = 0.5;

/** Thresholds are deliberately interpretable and scaled so sensitive < balanced < gentle. */
export const SENSITIVITY_THRESHOLDS: Readonly<
  Record<
    Sensitivity,
    {
      rollDegrees: number;
      yawDegrees: number;
      pitchDegrees: number;
      raisedShoulderBodyScale: number;
      bodyShiftScale: number;
      eyeClosureDrop: number;
    }
  >
> = {
  gentle: {
    rollDegrees: 16,
    yawDegrees: 25,
    pitchDegrees: 20,
    raisedShoulderBodyScale: 0.15,
    bodyShiftScale: 0.28,
    eyeClosureDrop: 0.58,
  },
  balanced: {
    rollDegrees: 11,
    yawDegrees: 18,
    pitchDegrees: 14,
    raisedShoulderBodyScale: 0.1,
    bodyShiftScale: 0.2,
    eyeClosureDrop: 0.48,
  },
  sensitive: {
    rollDegrees: 7,
    yawDegrees: 12,
    pitchDegrees: 9,
    raisedShoulderBodyScale: 0.065,
    bodyShiftScale: 0.13,
    eyeClosureDrop: 0.38,
  },
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validConfidence(value: unknown, min: number): value is number {
  return isFiniteNumber(value) && value >= min && value <= 1;
}

function validLandmark(value: unknown): value is Landmark {
  if (!value || typeof value !== "object") return false;
  const point = value as Landmark;
  return (
    isFiniteNumber(point.x) &&
    isFiniteNumber(point.y) &&
    validConfidence(point.confidence, LANDMARK_CONFIDENCE)
  );
}

function validFace(face: FaceObservation | null, minConfidence: number): face is FaceObservation {
  return (
    face !== null &&
    validConfidence(face.confidence, minConfidence) &&
    isFiniteNumber(face.yaw) &&
    isFiniteNumber(face.pitch) &&
    isFiniteNumber(face.roll) &&
    (face.leftEyeOpenProbability === null ||
      (isFiniteNumber(face.leftEyeOpenProbability) && face.leftEyeOpenProbability >= 0 && face.leftEyeOpenProbability <= 1)) &&
    (face.rightEyeOpenProbability === null ||
      (isFiniteNumber(face.rightEyeOpenProbability) && face.rightEyeOpenProbability >= 0 && face.rightEyeOpenProbability <= 1))
  );
}

function validPose(pose: FrameObservation["pose"], minConfidence: number): pose is NonNullable<FrameObservation["pose"]> {
  return pose !== null && validConfidence(pose.confidence, minConfidence);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function midpoint(a: Landmark, b: Landmark): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function poseGeometry(frame: FrameObservation, minConfidence: number) {
  if (!validPose(frame.pose, minConfidence)) return null;
  const landmarks = frame.pose.landmarks;
  const left = landmarks.leftShoulder;
  const right = landmarks.rightShoulder;
  const nose = landmarks.nose;
  if (!validLandmark(left) || !validLandmark(right) || !validLandmark(nose)) return null;
  const body = midpoint(left, right);
  const shoulderWidth = Math.hypot(right.x - left.x, right.y - left.y);
  const bodyScale = Math.hypot(nose.x - body.x, nose.y - body.y);
  if (shoulderWidth <= 0 || bodyScale <= 0) return null;
  return {
    shoulderMidpointY: body.y,
    noseAnchor: { x: nose.x, y: nose.y },
    bodyAnchor: body,
    shoulderWidth,
    bodyScale,
  };
}

/**
 * Aggregate at least two complete, sufficiently confident frames. Required pose keys are
 * nose, leftShoulder and rightShoulder; all coordinates are normalized image coordinates.
 */
export function calculateBaseline(
  observations: readonly FrameObservation[],
  options: { minConfidence?: number; minSamples?: number } = {},
): CalibrationBaseline | null {
  const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const minSamples = options.minSamples ?? DEFAULT_MIN_SAMPLES;
  const samples = observations.flatMap((frame) => {
    if (!validFace(frame.face, minConfidence)) return [];
    const geometry = poseGeometry(frame, minConfidence);
    if (!geometry) return [];
    return [{ face: frame.face, geometry }];
  });
  if (samples.length < minSamples) return null;

  return {
    faceYaw: mean(samples.map(({ face }) => face.yaw)),
    facePitch: mean(samples.map(({ face }) => face.pitch)),
    faceRoll: mean(samples.map(({ face }) => face.roll)),
    eyeOpenProbability: (() => {
      const eyeSamples = samples.flatMap(({ face }) => {
        if (face.leftEyeOpenProbability === null || face.rightEyeOpenProbability === null) return [];
        return [(face.leftEyeOpenProbability + face.rightEyeOpenProbability) / 2];
      });
      // A neutral open-eye reference is conservative when ML Kit cannot classify the baseline.
      return eyeSamples.length ? mean(eyeSamples) : 1;
    })(),
    shoulderMidpointY: mean(samples.map(({ geometry }) => geometry.shoulderMidpointY)),
    noseAnchor: {
      x: mean(samples.map(({ geometry }) => geometry.noseAnchor.x)),
      y: mean(samples.map(({ geometry }) => geometry.noseAnchor.y)),
    },
    bodyAnchor: {
      x: mean(samples.map(({ geometry }) => geometry.bodyAnchor.x)),
      y: mean(samples.map(({ geometry }) => geometry.bodyAnchor.y)),
    },
    shoulderWidth: mean(samples.map(({ geometry }) => geometry.shoulderWidth)),
    bodyScale: mean(samples.map(({ geometry }) => geometry.bodyScale)),
    sampleCount: samples.length,
  };
}

function issue(type: PostureIssueType, magnitude: number, threshold: number, confidence: number): PostureIssue {
  const ratio = threshold > 0 ? magnitude / threshold : 1;
  return {
    type,
    severity: ratio >= 2 ? "high" : ratio >= 1.4 ? "medium" : "low",
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

function faceConfidence(face: FaceObservation): number {
  return face.confidence;
}

/**
 * Compare one local frame with a calibration. Positive roll is clockwise in screen coordinates
 * (image y increases downward): it means the head top leans toward screen-right and is reported
 * as head_right; negative roll is head_left. Positive yaw is defined by the adapter as turning
 * toward screen-right. Pitch is treated as a magnitude of forward-head deviation from baseline,
 * avoiding assumptions about native-module pitch sign conventions.
 *
 * Eye closure is only a low-confidence likelihood based on reduced eye-open probability; this
 * does not detect squeezing, intent, or any medical condition. Missing observations are distinct
 * from low-confidence observations, which are ignored rather than treated as posture failures.
 */
export function compareFrameObservation(
  frame: FrameObservation,
  baseline: CalibrationBaseline,
  sensitivity: Sensitivity = "balanced",
  options: { minConfidence?: number; eyesCheckEnabled?: boolean } = {},
): PostureIssue[] {
  const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const thresholds = SENSITIVITY_THRESHOLDS[sensitivity];
  const found: PostureIssue[] = [];

  if (frame.face === null) {
    found.push(issue("face_missing", 1, 1, 1));
  } else if (validFace(frame.face, minConfidence)) {
    const face = frame.face;
    const rollDelta = face.roll - baseline.faceRoll;
    const yawDelta = face.yaw - baseline.faceYaw;
    if (rollDelta >= thresholds.rollDegrees) {
      found.push(issue("head_right", rollDelta, thresholds.rollDegrees, faceConfidence(face)));
    } else if (rollDelta <= -thresholds.rollDegrees) {
      found.push(issue("head_left", -rollDelta, thresholds.rollDegrees, faceConfidence(face)));
    }
    if (yawDelta >= thresholds.yawDegrees) {
      found.push(issue("head_right", yawDelta, thresholds.yawDegrees, faceConfidence(face)));
    } else if (yawDelta <= -thresholds.yawDegrees) {
      found.push(issue("head_left", -yawDelta, thresholds.yawDegrees, faceConfidence(face)));
    }

    const pitchDelta = Math.abs(face.pitch - baseline.facePitch);
    if (pitchDelta >= thresholds.pitchDegrees) {
      found.push(issue("head_forward", pitchDelta, thresholds.pitchDegrees, faceConfidence(face)));
    }

    if (
      options.eyesCheckEnabled !== false &&
      face.leftEyeOpenProbability !== null &&
      face.rightEyeOpenProbability !== null
    ) {
      const currentEyeOpen = (face.leftEyeOpenProbability + face.rightEyeOpenProbability) / 2;
      const closureDrop = baseline.eyeOpenProbability - currentEyeOpen;
      if (closureDrop >= thresholds.eyeClosureDrop) {
        found.push(issue("eyes_closed", closureDrop, thresholds.eyeClosureDrop, face.confidence * 0.65));
      }
    }
  }

  if (frame.pose === null) {
    found.push(issue("body_missing", 1, 1, 1));
  } else if (validPose(frame.pose, minConfidence)) {
    const geometry = poseGeometry(frame, minConfidence);
    if (geometry) {
      // Smaller y is higher on screen, so a negative midpoint delta indicates raised shoulders.
      const rise = (baseline.shoulderMidpointY - geometry.shoulderMidpointY) / baseline.bodyScale;
      if (rise >= thresholds.raisedShoulderBodyScale) {
        found.push(issue("shoulders_raised", rise, thresholds.raisedShoulderBodyScale, frame.pose.confidence));
      }
      const shift = Math.hypot(
        geometry.bodyAnchor.x - baseline.bodyAnchor.x,
        geometry.bodyAnchor.y - baseline.bodyAnchor.y,
      ) / baseline.bodyScale;
      if (shift >= thresholds.bodyShiftScale) {
        found.push(issue("body_shift", shift, thresholds.bodyShiftScale, frame.pose.confidence));
      }
    }
  }
  return found;
}

interface PendingIssue {
  since: number;
  confidenceTotal: number;
  confidenceCount: number;
}

interface ActiveIssue {
  start: number;
  confidence: number;
  lastSeen: number;
}

/** Stateful per-issue debounce and cooldown. Timestamp units are milliseconds. */
export class PostureEventTracker {
  private readonly pending = new Map<PostureIssueType, PendingIssue>();
  private readonly active = new Map<PostureIssueType, ActiveIssue>();
  private readonly lastEnded = new Map<PostureIssueType, number>();

  constructor(
    private readonly debounceMs = 1_200,
    private readonly cooldownMs = 5_000,
  ) {
    if (!Number.isFinite(debounceMs) || debounceMs < 0 || !Number.isFinite(cooldownMs) || cooldownMs < 0) {
      throw new RangeError("Debounce and cooldown durations must be finite non-negative milliseconds.");
    }
  }

  /** Feed the current frame's issues; emits start/end transitions only. */
  update(issues: readonly PostureIssue[], timestamp: number): PostureIssueEvent[] {
    if (!Number.isFinite(timestamp)) return [];
    const byType = new Map<PostureIssueType, PostureIssue>();
    for (const current of issues) {
      const existing = byType.get(current.type);
      if (!existing || current.confidence > existing.confidence) byType.set(current.type, current);
    }
    const emitted: PostureIssueEvent[] = [];

    for (const [type, active] of this.active) {
      const current = byType.get(type);
      if (current) {
        active.lastSeen = timestamp;
        active.confidence = (active.confidence + current.confidence) / 2;
      } else {
        emitted.push({
          issue: { type, severity: "low", confidence: active.confidence },
          status: "ended",
          startTimestamp: active.start,
          endTimestamp: timestamp,
          durationMs: Math.max(0, timestamp - active.start),
        });
        this.active.delete(type);
        this.pending.delete(type);
        this.lastEnded.set(type, timestamp);
      }
    }

    for (const [type, current] of byType) {
      if (this.active.has(type)) continue;
      let pending = this.pending.get(type);
      if (!pending) {
        pending = { since: timestamp, confidenceTotal: current.confidence, confidenceCount: 1 };
        this.pending.set(type, pending);
      } else {
        pending.confidenceTotal += current.confidence;
        pending.confidenceCount += 1;
      }
      const lastEnded = this.lastEnded.get(type);
      const coolingDown = lastEnded !== undefined && timestamp - lastEnded < this.cooldownMs;
      if (!coolingDown && timestamp - pending.since >= this.debounceMs) {
        const averageConfidence = pending.confidenceTotal / pending.confidenceCount;
        this.active.set(type, { start: pending.since, confidence: averageConfidence, lastSeen: timestamp });
        this.pending.delete(type);
        emitted.push({
          issue: { ...current, confidence: averageConfidence },
          status: "started",
          startTimestamp: pending.since,
          endTimestamp: null,
          durationMs: 0,
        });
      }
    }

    for (const type of this.pending.keys()) {
      if (!byType.has(type)) this.pending.delete(type);
    }
    return emitted;
  }

  /** Close active events at the supplied time, e.g. when a meditation session stops. */
  finish(timestamp: number): PostureIssueEvent[] {
    if (!Number.isFinite(timestamp)) return [];
    const emitted: PostureIssueEvent[] = [];
    for (const [type, active] of this.active) {
      emitted.push({
        issue: { type, severity: "low", confidence: active.confidence },
        status: "ended",
        startTimestamp: active.start,
        endTimestamp: timestamp,
        durationMs: Math.max(0, timestamp - active.start),
      });
      this.lastEnded.set(type, timestamp);
    }
    this.active.clear();
    this.pending.clear();
    return emitted;
  }
}
