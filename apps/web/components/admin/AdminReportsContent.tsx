"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { formatToman } from "schemas";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
type Summary = {
  orders: number;
  revenueRial: number;
  customers: number;
  activeProducts: number;
  lowStockProducts: number;
};
export function AdminReportsContent() {
  const [summary, setSummary] = useState<Summary>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void fetch(`${API_URL}/api/v1/admin/reports/summary`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json: { data: Summary }) => setSummary(json.data))
      .catch(() => setFailed(true));
  }, []);
  async function download(kind: string) {
    const res = await fetch(`${API_URL}/api/v1/admin/reports/export/${kind}`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `parsian-${kind}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  if (failed) return <Alert severity="error">دریافت گزارش‌ها ناموفق بود.</Alert>;
  if (!summary) return <CircularProgress />;
  const cards = [
    ["درآمد قطعی", formatToman(summary.revenueRial)],
    ["سفارش‌ها", summary.orders],
    ["مشتریان", summary.customers],
    ["محصول فعال", summary.activeProducts],
    ["کم‌موجود", summary.lowStockProducts],
  ];
  return (
    <Box>
      <Typography variant="h5" fontWeight={700}>
        گزارش‌ها و خروجی‌ها
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 2,
          my: 2,
        }}
      >
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardContent>
              <Typography color="text.secondary">{label}</Typography>
              <Typography variant="h5" fontWeight={700}>
                {value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Typography variant="subtitle1" fontWeight={700}>
        خروجی CSV
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
        <Button variant="outlined" onClick={() => void download("orders")}>
          سفارش‌ها
        </Button>
        <Button variant="outlined" onClick={() => void download("inventory")}>
          موجودی
        </Button>
        <Button variant="outlined" onClick={() => void download("customers")}>
          مشتریان
        </Button>
      </Stack>
    </Box>
  );
}
