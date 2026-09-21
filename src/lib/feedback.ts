import { database } from "./cms-db";
export type FeedbackStatus = "pending" | "published" | "hidden";
export type Feedback = { id: number; pain_point: string; search_query: string; locale: "en" | "zh"; status: FeedbackStatus; created_at: string };
export async function getPublishedFeedback() {
  return (await (await database()).query<Pick<Feedback, "id" | "pain_point" | "locale" | "created_at">>("SELECT id, pain_point, locale, created_at FROM feedback WHERE status='published' ORDER BY id DESC LIMIT 20")).rows;
}
