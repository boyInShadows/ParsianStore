"use client"; // Interactive filters + server-side pagination + row
// navigation, the same reasoning AdminProductsListContent documents.

import { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { formatToman, type AdminCouponDto, type CouponTypeDto } from "schemas";
import { useRouter } from "@/i18n/navigation";
import { fetchAdminCoupons, type AdminCouponListPage } from "@/lib/fetchers/admin-coupons";

const PAGE_SIZE = 20;

const TYPE_LABEL: Record<CouponTypeDto, string> = {
  percent: "درصدی",
  fixed: "مبلغ ثابت",
};

/** Mirrors coupons.admin.service.ts's own `activeFilter` -- the two
 * cart-dependent checks (minSubtotalRial, perUserLimit) are deliberately
 * absent from both, since neither is a property of the coupon alone. */
function isActive(coupon: AdminCouponDto, now: number): boolean {
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return false;
  if (coupon.endsAt && new Date(coupon.endsAt).getTime() <= now) return false;
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return false;
  return true;
}

function formatValue(coupon: AdminCouponDto): string {
  return coupon.type === "percent" ? `${coupon.value}٪` : formatToman(coupon.value);
}

function formatUsage(coupon: AdminCouponDto): string {
  return coupon.usageLimit == null
    ? `${coupon.usedCount}`
    : `${coupon.usedCount}/${coupon.usageLimit}`;
}

export function AdminCouponsListContent() {
  const router = useRouter();
  const [active, setActive] = useState<"true" | "false" | "">("");
  const [code, setCode] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<AdminCouponListPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Debounced so typing a code does not fire a request per keystroke.
    const timer = setTimeout(() => {
      void fetchAdminCoupons(page + 1, PAGE_SIZE, {
        active: active || undefined,
        code: code || undefined,
      }).then((data) => {
        if (!cancelled) {
          setResult(data);
          setLoading(false);
        }
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, active, code]);

  const handlePaginationModelChange = useCallback((model: GridPaginationModel) => {
    setLoading(true);
    setPage(model.page);
  }, []);

  const columns: GridColDef<AdminCouponDto>[] = [
    { field: "code", headerName: "کد", flex: 1, minWidth: 140 },
    {
      field: "type",
      headerName: "نوع",
      width: 120,
      valueGetter: (value: CouponTypeDto) => TYPE_LABEL[value],
    },
    {
      field: "value",
      headerName: "مقدار",
      width: 150,
      renderCell: ({ row }) => formatValue(row),
    },
    {
      field: "usedCount",
      headerName: "استفاده‌شده",
      width: 130,
      renderCell: ({ row }) => formatUsage(row),
    },
    {
      field: "endsAt",
      headerName: "وضعیت",
      width: 120,
      renderCell: ({ row }) =>
        isActive(row, Date.now()) ? (
          <Chip label="فعال" color="success" size="small" />
        ) : (
          <Chip label="غیرفعال" color="default" size="small" />
        ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          کدهای تخفیف
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
          <TextField
            size="small"
            label="جست‌وجوی کد"
            value={code}
            onChange={(event) => {
              setLoading(true);
              setPage(0);
              setCode(event.target.value);
            }}
          />
          <Select
            size="small"
            displayEmpty
            value={active}
            inputProps={{ "aria-label": "فیلتر وضعیت" }}
            onChange={(event) => {
              setLoading(true);
              setPage(0);
              setActive(event.target.value as "true" | "false" | "");
            }}
          >
            <MenuItem value="">همه وضعیت‌ها</MenuItem>
            <MenuItem value="true">فعال</MenuItem>
            <MenuItem value="false">غیرفعال</MenuItem>
          </Select>
          <Button variant="contained" onClick={() => router.push("/admin/discounts/new")}>
            کد تخفیف جدید
          </Button>
        </Stack>
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
        onRowClick={(params) => router.push(`/admin/discounts/${params.id}`)}
        sx={{ cursor: "pointer" }}
        disableRowSelectionOnClick
        autoHeight
      />
    </Stack>
  );
}
