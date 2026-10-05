import {
  adminQuestionsResponseSchema,
  adminReviewsResponseSchema,
  type AdminQuestionDto,
  type AdminReviewDto,
} from "schemas";
import { API_URL, apiFetch, jsonBody } from "@/lib/api-fetch";

export async function fetchAdminFeedback(
  status = "pending",
): Promise<{ reviews: AdminReviewDto[]; questions: AdminQuestionDto[] } | null> {
  const query = `?status=${status}&limit=100`;
  const init: RequestInit = { credentials: "include" };
  const [r, q] = await Promise.all([
    apiFetch(`${API_URL}/api/v1/admin/feedback/reviews${query}`, adminReviewsResponseSchema, init),
    apiFetch(
      `${API_URL}/api/v1/admin/feedback/questions${query}`,
      adminQuestionsResponseSchema,
      init,
    ),
  ]);
  return r.ok && q.ok ? { reviews: r.data.data, questions: q.data.data } : null;
}
export async function moderateFeedback(
  kind: "reviews" | "questions",
  id: string,
  status: "approved" | "rejected",
  answer?: string,
): Promise<boolean> {
  const res = await apiFetch(`${API_URL}/api/v1/admin/feedback/${kind}/${id}`, null, {
    method: "PATCH",
    credentials: "include",
    ...jsonBody({ status, answer: answer || undefined }),
  });
  return res.ok;
}
