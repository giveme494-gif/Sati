import type { PostureIssueType } from "./types";

export const ISSUE_LABELS: Record<PostureIssueType, string> = {
  head_left: "ခေါင်း ဘယ်ဘက်သို့ စောင်း/လှည့်နေသည်",
  head_right: "ခေါင်း ညာဘက်သို့ စောင်း/လှည့်နေသည်",
  head_forward: "ခေါင်း ငိုက်နေသည်",
  shoulders_raised: "ပခုံး ပင့်တင်နေသည်",
  body_shift: "ကိုယ်ခန္ဓာ ရွေ့နေသည်",
  eyes_closed: "မျက်လုံး ပိတ်သွားသည်",
  face_missing: "မျက်နှာကို မတွေ့ပါ",
  body_missing: "ကိုယ်ဟန်ကို မတွေ့ပါ",
};

export const ISSUE_CORRECTIONS: Record<PostureIssueType, string> = {
  head_left: "ခေါင်းကို ညာဘက်သို့ ဖြည်းဖြည်း ပြန်တည့်ပါ",
  head_right: "ခေါင်းကို ဘယ်ဘက်သို့ ဖြည်းဖြည်း ပြန်တည့်ပါ",
  head_forward: "ခေါင်းကို ဖြည်းဖြည်း မတ်မတ်ထားပါ",
  shoulders_raised: "ပခုံးကို ဖြည်းဖြည်း လျှော့ချပါ",
  body_shift: "ကိုယ်ခန္ဓာကို အလယ်တည့်တည့် ပြန်ထားပါ",
  eyes_closed: "မျက်လုံးကို အားမစိုက်ဘဲ ပျော့ပျော့လေးထားပါ",
  face_missing: "ဖုန်းကို မျက်နှာမြင်ရအောင် နေရာချပါ",
  body_missing: "ကိုယ်ဟန်တစ်ခုလုံး မြင်ရအောင် ထိုင်ပါ",
};

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes} မိနစ် ${remainder} စက္ကန့်` : `${remainder} စက္ကန့်`;
}
