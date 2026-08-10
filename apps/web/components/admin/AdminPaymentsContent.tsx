"use client";
import { useEffect, useState } from "react";
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { formatToman } from "schemas";
type Row = {
  id: string;
  orderCode?: string;
  paymentStatus?: string;
  orderStatus?: string;
  amountRial?: number;
  orderTotalRial?: number;
  issues: string[];
};
type Result = { counts: { payments: number; orders: number; issues: number }; rows: Row[] };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export function AdminPaymentsContent() {
  const [result, setResult] = useState<Result>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void fetch(`${API_URL}/api/v1/admin/payments/reconciliation`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json: { data: Result }) => setResult(json.data))
      .catch(() => setFailed(true));
  }, []);
  if (failed) return <Alert severity="error">دریافت وضعیت تطبیق پرداخت‌ها ناموفق بود.</Alert>;
  if (!result) return <CircularProgress />;
  const columns: GridColDef<Row>[] = [
    { field: "orderCode", headerName: "کد سفارش", minWidth: 150, flex: 1 },
    { field: "paymentStatus", headerName: "وضعیت پرداخت", minWidth: 130 },
    { field: "orderStatus", headerName: "وضعیت سفارش", minWidth: 130 },
    {
      field: "amountRial",
      headerName: "مبلغ پرداخت",
      minWidth: 150,
      valueFormatter: (value?: number) => (value == null ? "—" : formatToman(value)),
    },
    {
      field: "orderTotalRial",
      headerName: "جمع سفارش",
      minWidth: 150,
      valueFormatter: (value?: number) => (value == null ? "—" : formatToman(value)),
    },
    {
      field: "issues",
      headerName: "مغایرت‌ها",
      flex: 2,
      minWidth: 280,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {params.value.map((issue: string) => (
            <Chip key={issue} label={issue} size="small" color="warning" />
          ))}
        </Stack>
      ),
    },
  ];
  return (
    <Box>
      <Typography variant="h5" fontWeight={700}>
        تطبیق پرداخت‌ها
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        بررسی داخلی سفارش و پرداخت؛ بدون تماس با درگاه زنده. {result.counts.issues} مغایرت از{" "}
        {result.counts.payments} پرداخت.
      </Typography>
      <DataGrid
        autoHeight
        disableRowSelectionOnClick
        rows={result.rows}
        columns={columns}
        pageSizeOptions={[20]}
        initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
      />
    </Box>
  );
}
