"use client"; // queue filters, moderation actions, and answer drafting are interactive

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { formatJalali, type AdminQuestionDto, type AdminReviewDto } from "schemas";
import { fetchAdminFeedback, moderateFeedback } from "@/lib/fetchers/admin-feedback";

export function AdminFeedbackContent() {
  const [status, setStatus] = useState("pending");
  const [reviews, setReviews] = useState<AdminReviewDto[]>([]);
  const [questions, setQuestions] = useState<AdminQuestionDto[]>([]);
  const [failed, setFailed] = useState(false);
  const [answer, setAnswer] = useState<Record<string, string>>({});
  const load = useCallback(() => {
    void fetchAdminFeedback(status).then((data) => {
      setFailed(!data);
      setReviews(data?.reviews ?? []);
      setQuestions(data?.questions ?? []);
    });
  }, [status]);
  useEffect(load, [load]);
  async function act(kind: "reviews" | "questions", id: string, next: "approved" | "rejected") {
    const ok = await moderateFeedback(
      kind,
      id,
      next,
      kind === "questions" ? answer[id] : undefined,
    );
    if (!ok) setFailed(true);
    else load();
  }
  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography component="h1" variant="h4" fontWeight={900}>
            نظرات و پرسش‌ها
          </Typography>
          <Typography color="text.secondary">بررسی محتوای مشتریان پیش از نمایش عمومی</Typography>
        </Box>
        <Select size="small" value={status} onChange={(e) => setStatus(e.target.value)}>
          <MenuItem value="pending">در انتظار بررسی</MenuItem>
          <MenuItem value="approved">تاییدشده</MenuItem>
          <MenuItem value="rejected">ردشده</MenuItem>
        </Select>
      </Box>
      {failed ? <Alert severity="error">دریافت یا به‌روزرسانی صف انجام نشد.</Alert> : null}
      <Queue title="نظرات" empty="نظری در این وضعیت وجود ندارد.">
        {reviews.map((item) => (
          <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={800}>
              {item.title} · {item.rating}/5
            </Typography>
            <Typography sx={{ my: 1 }}>{item.body}</Typography>
            <Meta name={item.authorNameSnapshot} date={item.createdAt} />
            <Actions
              onApprove={() => void act("reviews", item.id, "approved")}
              onReject={() => void act("reviews", item.id, "rejected")}
            />
          </Paper>
        ))}
      </Queue>
      <Queue title="پرسش‌ها" empty="پرسشی در این وضعیت وجود ندارد.">
        {questions.map((item) => (
          <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
            <Typography>{item.body}</Typography>
            <Meta name={item.authorNameSnapshot} date={item.createdAt} />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="پاسخ فروشگاه"
              value={answer[item.id] ?? item.answer ?? ""}
              onChange={(e) => setAnswer((old) => ({ ...old, [item.id]: e.target.value }))}
              sx={{ mt: 2 }}
            />
            <Actions
              onApprove={() => void act("questions", item.id, "approved")}
              onReject={() => void act("questions", item.id, "rejected")}
            />
          </Paper>
        ))}
      </Queue>
    </Stack>
  );
}
function Queue({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  return (
    <Stack spacing={1.5}>
      <Typography component="h2" variant="h6" fontWeight={800}>
        {title}
      </Typography>
      {Array.isArray(children) && children.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, color: "text.secondary" }}>
          {empty}
        </Paper>
      ) : (
        children
      )}
    </Stack>
  );
}
function Meta({ name, date }: { name: string; date: string }) {
  return (
    <Typography variant="caption" color="text.secondary">
      {name} · {formatJalali(date, "D MMMM YYYY")}
    </Typography>
  );
}
function Actions({ onApprove, onReject }: { onApprove(): void; onReject(): void }) {
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
      <Button variant="contained" onClick={onApprove}>
        تایید
      </Button>
      <Button color="error" variant="outlined" onClick={onReject}>
        رد
      </Button>
    </Stack>
  );
}
