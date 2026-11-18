/** A normalized image-space landmark (x/y are normally in [0, 1]). */
export interface Landmark {
  x: number;
  y: number;
  confidence: number;
}

/** Angles are degrees; eye probabilities are in [0, 1]. */
export interface FaceObservation {
  yaw: number;
  pitch: number;
  roll: number;
  leftEyeOpenProbability: number | null;
  rightEyeOpenProbability: number | null;
  confidence: number;
}

/** Landmark keys are supplied by the local camera/native adapter (e.g. nose, leftShoulder). */
export interface PoseObservation {
  landmarks: Record<string, Landmark>;
  confidence: number;
}

/** A single local frame analysis. Images and frame pixels are intentionally not represented. */
export interface FrameObservation {
  timestamp: number;
  face: FaceObservation | null;
  pose: PoseObservation | null;
}

export type PostureIssueType =
  | "head_left"
  | "head_right"
  | "head_forward"
  | "shoulders_raised"
  | "body_shift"
  | "eyes_closed"
  | "face_missing"
  | "body_missing";

/** A localization-independent issue measurement. */
export interface PostureIssue {
  type: PostureIssueType;
  severity: "low" | "medium" | "high";
  confidence: number;
}

/** Aggregated normalized reference posture, computed from valid local observations. */
export interface CalibrationBaseline {
  faceYaw: number;
  facePitch: number;
  faceRoll: number;
  eyeOpenProbability: number;
  shoulderMidpointY: number;
  noseAnchor: { x: number; y: number };
  bodyAnchor: { x: number; y: number };
  shoulderWidth: number;
  /** Normalized nose-to-shoulder-midpoint distance; used to scale shifts. */
  bodyScale: number;
  sampleCount: number;
}

export type Sensitivity = "gentle" | "balanced" | "sensitive";

export interface Settings {
  sensitivity: Sensitivity;
  reminderDelaySeconds: number;
  cooldownSeconds: number;
  voiceEnabled: boolean;
  eyesCheckEnabled: boolean;
}

export type PostureEventStatus = "started" | "ended";

/** A debounced local issue event; an active event has endTimestamp=null. */
export interface PostureIssueEvent {
  issue: PostureIssue;
  status: PostureEventStatus;
  startTimestamp: number;
  endTimestamp: number | null;
  durationMs: number;
}
