import {
  adminQuestionsResponseSchema,
  adminReviewsResponseSchema,
  type AdminQuestionDto,
  type AdminReviewDto,
} from "schemas";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export async function fetchAdminFeedback(
  status = "pending",
): Promise<{ reviews: AdminReviewDto[]; questions: AdminQuestionDto[] } | null> {
  try {
    const query = `?status=${status}&limit=100`;
    const [r, q] = await Promise.all([
      fetch(`${API_URL}/api/v1/admin/feedback/reviews${query}`, { credentials: "include" }),
      fetch(`${API_URL}/api/v1/admin/feedback/questions${query}`, { credentials: "include" }),
    ]);
    if (!r.ok || !q.ok) return null;
    const rp = adminReviewsResponseSchema.safeParse(await r.json());
    const qp = adminQuestionsResponseSchema.safeParse(await q.json());
    return rp.success && qp.success ? { reviews: rp.data.data, questions: qp.data.data } : null;
  } catch {
    return null;
  }
}
export async function moderateFeedback(
  kind: "reviews" | "questions",
  id: string,
  status: "approved" | "rejected",
  answer?: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/feedback/${kind}/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, answer: answer || undefined }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
