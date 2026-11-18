import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CalibrationBaseline, PostureIssueEvent, Settings } from "../vision/types";

const KEYS = {
  calibration: "sati:vision:calibration:v1",
  settings: "sati:vision:settings:v1",
  sessions: "sati:meditation:sessions:v1",
} as const;

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  sensitivity: "balanced",
  reminderDelaySeconds: 5,
  cooldownSeconds: 20,
  voiceEnabled: true,
  eyesCheckEnabled: true,
});

/** Persisted summary only: camera frames and images are never accepted or written here. */
export interface SessionMetadata {
  id: string;
  startTimestamp: number;
  endTimestamp: number | null;
  totalSeconds: number;
  events: PostureIssueEvent[];
  goodSeconds: number;
  stableScore: number;
}

export interface FinishSessionInput {
  endTimestamp: number;
  totalSeconds: number;
  events?: PostureIssueEvent[];
  goodSeconds: number;
  stableScore: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validBaseline(value: unknown): value is CalibrationBaseline {
  if (!isRecord(value) || !isRecord(value.noseAnchor) || !isRecord(value.bodyAnchor)) return false;
  const numbers = [
    value.faceYaw,
    value.facePitch,
    value.faceRoll,
    value.eyeOpenProbability,
    value.shoulderMidpointY,
    value.noseAnchor.x,
    value.noseAnchor.y,
    value.bodyAnchor.x,
    value.bodyAnchor.y,
    value.shoulderWidth,
    value.bodyScale,
    value.sampleCount,
  ];
  return numbers.every(finite) &&
    (value.eyeOpenProbability as number) >= 0 && (value.eyeOpenProbability as number) <= 1 &&
    (value.shoulderWidth as number) > 0 && (value.bodyScale as number) > 0 &&
    Number.isInteger(value.sampleCount) && (value.sampleCount as number) >= 1;
}

function validSettings(value: unknown): value is Settings {
  return isRecord(value) &&
    (value.sensitivity === "gentle" || value.sensitivity === "balanced" || value.sensitivity === "sensitive") &&
    finite(value.reminderDelaySeconds) && value.reminderDelaySeconds >= 0 &&
    finite(value.cooldownSeconds) && value.cooldownSeconds >= 0 &&
    typeof value.voiceEnabled === "boolean" && typeof value.eyesCheckEnabled === "boolean";
}

const ISSUE_TYPES = new Set([
  "head_left", "head_right", "head_forward", "shoulders_raised", "body_shift",
  "eyes_closed", "face_missing", "body_missing",
]);

function validEvent(value: unknown): value is PostureIssueEvent {
  if (!isRecord(value) || !isRecord(value.issue)) return false;
  const issue = value.issue;
  return typeof issue.type === "string" && ISSUE_TYPES.has(issue.type) &&
    (issue.severity === "low" || issue.severity === "medium" || issue.severity === "high") &&
    finite(issue.confidence) && issue.confidence >= 0 && issue.confidence <= 1 &&
    (value.status === "started" || value.status === "ended") &&
    finite(value.startTimestamp) &&
    (value.endTimestamp === null || finite(value.endTimestamp)) &&
    finite(value.durationMs) && value.durationMs >= 0;
}

function validSession(value: unknown): value is SessionMetadata {
  return isRecord(value) && typeof value.id === "string" && value.id.length > 0 &&
    finite(value.startTimestamp) && (value.endTimestamp === null || finite(value.endTimestamp)) &&
    finite(value.totalSeconds) && value.totalSeconds >= 0 && Array.isArray(value.events) &&
    value.events.every(validEvent) && finite(value.goodSeconds) && value.goodSeconds >= 0 &&
    finite(value.stableScore) && value.stableScore >= 0 && value.stableScore <= 100;
}

function parseJson(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function getRaw(key: string): Promise<string | null> {
  // Access failures are deliberately allowed to propagate to mutating methods.
  return AsyncStorage.getItem(key);
}

async function readSessionsForMutation(): Promise<SessionMetadata[]> {
  const parsed = parseJson(await getRaw(KEYS.sessions));
  return Array.isArray(parsed) ? parsed.filter(validSession) : [];
}

/** Local-only persistence facade. Read methods use safe defaults; write failures reject. */
export const sessionStore = {
  async readCalibration(): Promise<CalibrationBaseline | null> {
    try {
      const parsed = parseJson(await getRaw(KEYS.calibration));
      return validBaseline(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  async writeCalibration(calibration: CalibrationBaseline): Promise<void> {
    if (!validBaseline(calibration)) throw new TypeError("Invalid calibration baseline.");
    await AsyncStorage.setItem(KEYS.calibration, JSON.stringify(calibration));
  },

  async clearCalibration(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.calibration);
  },

  async readSettings(): Promise<Settings> {
    try {
      const parsed = parseJson(await getRaw(KEYS.settings));
      return validSettings(parsed) ? parsed : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  async writeSettings(settings: Settings): Promise<void> {
    if (!validSettings(settings)) throw new TypeError("Invalid settings.");
    await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
  },

  async appendSession(session: SessionMetadata): Promise<void> {
    if (!validSession(session)) throw new TypeError("Invalid session metadata.");
    const sessions = await readSessionsForMutation();
    const existingIndex = sessions.findIndex((item) => item.id === session.id);
    if (existingIndex >= 0) sessions[existingIndex] = session;
    else sessions.push(session);
    await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
  },

  async listSessions(): Promise<SessionMetadata[]> {
    try {
      const parsed = parseJson(await getRaw(KEYS.sessions));
      return Array.isArray(parsed) ? parsed.filter(validSession) : [];
    } catch {
      return [];
    }
  },

  async finishSession(id: string, finish: FinishSessionInput): Promise<SessionMetadata | null> {
    if (!id || !finite(finish.endTimestamp) || !finite(finish.totalSeconds) || finish.totalSeconds < 0 ||
      !finite(finish.goodSeconds) || finish.goodSeconds < 0 || !finite(finish.stableScore) ||
      finish.stableScore < 0 || finish.stableScore > 100 ||
      (finish.events !== undefined && !finish.events.every(validEvent))) {
      throw new TypeError("Invalid session finish metadata.");
    }
    const sessions = await readSessionsForMutation();
    const index = sessions.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const finished: SessionMetadata = {
      ...sessions[index],
      endTimestamp: finish.endTimestamp,
      totalSeconds: finish.totalSeconds,
      events: finish.events ?? sessions[index].events,
      goodSeconds: finish.goodSeconds,
      stableScore: finish.stableScore,
    };
    sessions[index] = finished;
    await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
    return finished;
  },

  async clearHistory(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.sessions);
  },
};
