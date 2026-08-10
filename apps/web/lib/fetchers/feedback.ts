import {
  feedbackCreatedResponseSchema,
  questionsResponseSchema,
  reviewsResponseSchema,
  type QuestionDto,
  type ReviewDto,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function fetchProductFeedback(
  productId: string,
): Promise<{ reviews: ReviewDto[]; questions: QuestionDto[] }> {
  try {
    const [reviewsRes, questionsRes] = await Promise.all([
      fetch(`${API_URL}/api/v1/feedback/products/${productId}/reviews?limit=20`),
      fetch(`${API_URL}/api/v1/feedback/products/${productId}/questions?limit=20`),
    ]);
    const reviews = reviewsRes.ok ? reviewsResponseSchema.safeParse(await reviewsRes.json()) : null;
    const questions = questionsRes.ok
      ? questionsResponseSchema.safeParse(await questionsRes.json())
      : null;
    return {
      reviews: reviews?.success ? reviews.data.data : [],
      questions: questions?.success ? questions.data.data : [],
    };
  } catch {
    return { reviews: [], questions: [] };
  }
}

async function post(
  path: string,
  body: unknown,
): Promise<{ ok: true } | { ok: false; message?: string }> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok)
      return {
        ok: false,
        message: typeof json?.error?.message === "string" ? json.error.message : undefined,
      };
    return feedbackCreatedResponseSchema.safeParse(json).success ? { ok: true } : { ok: false };
  } catch {
    return { ok: false };
  }
}
export function submitReview(
  productId: string,
  input: { rating: number; title: string; body: string },
) {
  return post(`/api/v1/feedback/products/${productId}/reviews`, input);
}
export function submitQuestion(productId: string, body: string) {
  return post(`/api/v1/feedback/products/${productId}/questions`, { body });
}
