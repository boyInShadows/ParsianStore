"use client"; // submits authenticated review/question forms and reflects pending state

import { useState, type FormEvent } from "react";
import { formatJalali, type QuestionDto, type ReviewDto } from "schemas";
import { Link } from "@/i18n/navigation";
import { Button, Input, Textarea } from "@/components/primitives";
import { submitQuestion, submitReview } from "@/lib/fetchers/feedback";
import { useAuthStore } from "@/stores/auth-store";

export type ProductFeedbackMessages = {
  reviewsTitle: string;
  questionsTitle: string;
  noReviews: string;
  noQuestions: string;
  verified: string;
  answer: string;
  signIn: string;
  pending: string;
  error: string;
  ratingLabel: string;
  titleLabel: string;
  reviewBodyLabel: string;
  reviewSubmit: string;
  questionBodyLabel: string;
  questionSubmit: string;
};
type Props = {
  productId: string;
  reviews: ReviewDto[];
  questions: QuestionDto[];
  messages: ProductFeedbackMessages;
};

export function ProductFeedback({ productId, reviews, questions, messages }: Props) {
  const authenticated = useAuthStore((state) => state.status) === "authenticated";
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function reviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    const data = new FormData(event.currentTarget);
    const result = await submitReview(productId, {
      rating: Number(data.get("rating")),
      title: String(data.get("title") ?? ""),
      body: String(data.get("body") ?? ""),
    });
    setPending(false);
    if (result.ok) {
      setNotice(messages.pending);
      event.currentTarget.reset();
    } else setError(result.message ?? messages.error);
  }
  async function questionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    const result = await submitQuestion(
      productId,
      String(new FormData(event.currentTarget).get("body") ?? ""),
    );
    setPending(false);
    if (result.ok) {
      setNotice(messages.pending);
      event.currentTarget.reset();
    } else setError(result.message ?? messages.error);
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="border-b border-rule pb-3 text-h2 font-black text-text">
          {messages.reviewsTitle}
        </h2>
        <div className="divide-y divide-rule">
          {reviews.length ? (
            reviews.map((review) => (
              <article key={review.id} className="py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-text">{review.authorName}</strong>
                  <span className="font-mono text-price">{review.rating}/5</span>
                  {review.verifiedPurchase ? (
                    <span className="rounded-full bg-brand-subtle px-2 py-1 text-caption text-brand">
                      {messages.verified}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 font-bold text-text">{review.title}</h3>
                <p className="mt-1 text-body-sm text-text-muted">{review.body}</p>
                <time className="mt-2 block text-caption text-text-muted">
                  {formatJalali(review.createdAt, "short")}
                </time>
              </article>
            ))
          ) : (
            <p className="py-4 text-body-sm text-text-muted">{messages.noReviews}</p>
          )}
        </div>
        {authenticated ? (
          <form onSubmit={(event) => void reviewSubmit(event)} className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-body-sm font-medium text-text">
              {messages.ratingLabel}
              <select
                name="rating"
                defaultValue="5"
                className="min-h-12 rounded-md border border-border bg-surface px-3"
              >
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </label>
            <Input
              name="title"
              label={messages.titleLabel}
              minLength={3}
              maxLength={120}
              required
            />
            <Textarea
              name="body"
              label={messages.reviewBodyLabel}
              minLength={10}
              maxLength={2000}
              required
            />
            <Button type="submit" disabled={pending}>
              {messages.reviewSubmit}
            </Button>
          </form>
        ) : (
          <Link href="/auth/login" className="mt-4 inline-block text-brand hover:underline">
            {messages.signIn}
          </Link>
        )}
      </section>
      <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="border-b border-rule pb-3 text-h2 font-black text-text">
          {messages.questionsTitle}
        </h2>
        <div className="divide-y divide-rule">
          {questions.length ? (
            questions.map((question) => (
              <article key={question.id} className="py-4">
                <strong className="text-text">{question.authorName}</strong>
                <p className="mt-2 text-body-sm text-text">{question.body}</p>
                {question.answer ? (
                  <div className="mt-3 border-s-2 border-brand ps-3">
                    <p className="text-caption font-bold text-brand">{messages.answer}</p>
                    <p className="text-body-sm text-text-muted">{question.answer}</p>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <p className="py-4 text-body-sm text-text-muted">{messages.noQuestions}</p>
          )}
        </div>
        {authenticated ? (
          <form
            onSubmit={(event) => void questionSubmit(event)}
            className="mt-4 flex flex-col gap-3"
          >
            <Textarea
              name="body"
              label={messages.questionBodyLabel}
              minLength={10}
              maxLength={1000}
              required
            />
            <Button type="submit" disabled={pending}>
              {messages.questionSubmit}
            </Button>
          </form>
        ) : (
          <Link href="/auth/login" className="mt-4 inline-block text-brand hover:underline">
            {messages.signIn}
          </Link>
        )}
        {notice ? (
          <p role="status" className="mt-3 text-body-sm text-brand">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 text-body-sm text-danger">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
