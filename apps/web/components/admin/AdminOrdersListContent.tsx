"use client"; // DataGrid pagination + status filter + row-click navigation, all client state

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Chip, MenuItem, Select, Typography, type SelectChangeEvent } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { formatJalali, formatToman, orderStatusSchema, type OrderStatusDto } from "schemas";
import { useRouter } from "@/i18n/navigation";
import { fetchAdminOrders, type AdminOrderListPage } from "@/lib/fetchers/admin-orders";

const STATUS_TONE: Record<OrderStatusDto, "default" | "info" | "success" | "error"> = {
  pending: "default",
  paid: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "error",
  refunded: "error",
};

const PAGE_SIZE = 20;

export function AdminOrdersListContent() {
  const t = useTranslations("Orders.status");
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatusDto | "">("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<AdminOrderListPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminOrders(page + 1, PAGE_SIZE, status || undefined).then((data) => {
      if (!cancelled) {
        setResult(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [page, status]);

  function handleStatusChange(event: SelectChangeEvent): void {
    setLoading(true);
    setStatus(event.target.value as OrderStatusDto | "");
    setPage(0);
  }

  function handlePaginationModelChange(model: { page: number }): void {
    setLoading(true);
    setPage(model.page);
  }

  const columns: GridColDef[] = [
    { field: "code", headerName: "کد سفارش", flex: 1, minWidth: 140 },
    { field: "customerPhone", headerName: "مشتری", flex: 1, minWidth: 140 },
    {
      field: "status",
      headerName: "وضعیت",
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Chip
          label={t(params.value as OrderStatusDto)}
          color={STATUS_TONE[params.value as OrderStatusDto]}
          size="small"
        />
      ),
    },
    { field: "itemCount", headerName: "تعداد اقلام", type: "number", width: 110 },
    {
      field: "totalRial",
      headerName: "مبلغ",
      flex: 1,
      minWidth: 140,
      valueFormatter: (value: number) => formatToman(value),
    },
    {
      field: "createdAt",
      headerName: "تاریخ ثبت",
      flex: 1,
      minWidth: 140,
      valueFormatter: (value: string) => formatJalali(value, "YYYY/MM/DD"),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          سفارش‌ها
        </Typography>
        <Select
          size="small"
          value={status}
          onChange={handleStatusChange}
          displayEmpty
          inputProps={{ "aria-label": "فیلتر وضعیت سفارش" }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">همه وضعیت‌ها</MenuItem>
          {orderStatusSchema.options.map((value) => (
            <MenuItem key={value} value={value}>
              {t(value)}
            </MenuItem>
          ))}
        </Select>
      </Box>
      <DataGrid
        rows={result?.data ?? []}
        columns={columns}
        loading={loading}
        rowCount={result?.total ?? 0}
        paginationMode="server"
        paginationModel={{ page, pageSize: PAGE_SIZE }}
        onPaginationModelChange={handlePaginationModelChange}
        pageSizeOptions={[PAGE_SIZE]}
        onRowClick={(params) => router.push(`/admin/orders/${params.id}`)}
        sx={{ cursor: "pointer" }}
        disableRowSelectionOnClick
        autoHeight
      />
    </Box>
  );
}
