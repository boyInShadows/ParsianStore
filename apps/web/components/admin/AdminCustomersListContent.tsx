"use client"; // Search box, pagination, and an inline account-type
// toggle -- all interactive, same reasoning as the other admin lists.

import { useCallback, useEffect, useState } from "react";
import { Alert, Box, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { toPersianDigits, type AccountTypeDto, type AdminCustomerDto } from "schemas";
import {
  fetchAdminCustomers,
  setAdminCustomerAccountType,
  type AdminCustomerListPage,
} from "@/lib/fetchers/admin-customers";
import { useToastStore } from "@/stores/toast-store";

const PAGE_SIZE = 20;

export function AdminCustomersListContent() {
  const showToast = useToastStore((state) => state.show);
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState<AccountTypeDto | "">("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<AdminCustomerListPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void fetchAdminCustomers(page + 1, PAGE_SIZE, {
        phone: phone || undefined,
        accountType: accountType || undefined,
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
  }, [page, phone, accountType]);

  const handlePaginationModelChange = useCallback((model: GridPaginationModel) => {
    setLoading(true);
    setPage(model.page);
  }, []);

  async function handleAccountTypeChange(id: string, next: AccountTypeDto): Promise<void> {
    setSavingId(id);
    const response = await setAdminCustomerAccountType(id, next);
    setSavingId(null);
    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    // Patch the one changed row in place rather than refetching the page --
    // a refetch would reset scroll position mid-edit for no gain.
    setResult((previous) =>
      previous
        ? { ...previous, data: previous.data.map((row) => (row.id === id ? response.data : row)) }
        : previous,
    );
    showToast(next === "wholesale" ? "حساب عمده‌فروشی شد" : "حساب خرده‌فروشی شد", "success");
  }

  const columns: GridColDef<AdminCustomerDto>[] = [
    {
      field: "phone",
      headerName: "شماره موبایل",
      flex: 1,
      minWidth: 160,
      valueGetter: (value: string) => toPersianDigits(value),
    },
    { field: "name", headerName: "نام", flex: 1, minWidth: 140 },
    {
      field: "accountType",
      headerName: "نوع حساب",
      width: 190,
      sortable: false,
      renderCell: ({ row }) => (
        <Select
          size="small"
          value={row.accountType}
          disabled={savingId === row.id}
          inputProps={{ "aria-label": `نوع حساب ${row.phone}` }}
          onChange={(event) =>
            void handleAccountTypeChange(row.id, event.target.value as AccountTypeDto)
          }
          fullWidth
        >
          <MenuItem value="retail">خرده‌فروشی</MenuItem>
          <MenuItem value="wholesale">عمده‌فروشی</MenuItem>
        </Select>
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
          مشتریان
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
          <TextField
            size="small"
            label="جست‌وجوی شماره"
            value={phone}
            onChange={(event) => {
              setLoading(true);
              setPage(0);
              setPhone(event.target.value);
            }}
          />
          <Select
            size="small"
            displayEmpty
            value={accountType}
            inputProps={{ "aria-label": "فیلتر نوع حساب" }}
            onChange={(event) => {
              setLoading(true);
              setPage(0);
              setAccountType(event.target.value as AccountTypeDto | "");
            }}
          >
            <MenuItem value="">همه حساب‌ها</MenuItem>
            <MenuItem value="retail">خرده‌فروشی</MenuItem>
            <MenuItem value="wholesale">عمده‌فروشی</MenuItem>
          </Select>
        </Stack>
      </Box>

      {/* accountType is baked into the JWT at issue time (utils/jwt.ts), so
          this is a real, user-visible delay -- said out loud rather than
          letting staff assume the new price is live immediately. */}
      <Alert severity="info">
        تغییر نوع حساب پس از تازه‌سازی نشست کاربر روی قیمت‌هایی که می‌بیند اعمال می‌شود، نه
        بلافاصله.
      </Alert>

      <DataGrid
        rows={result?.data ?? []}
        columns={columns}
        loading={loading}
        rowCount={result?.total ?? 0}
        paginationMode="server"
        paginationModel={{ page, pageSize: PAGE_SIZE }}
        onPaginationModelChange={handlePaginationModelChange}
        pageSizeOptions={[PAGE_SIZE]}
        disableRowSelectionOnClick
        autoHeight
      />
    </Stack>
  );
}
