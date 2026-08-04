"use client"; // Search, filters, pagination, and a create/edit dialog.

import { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { toPersianDigits, type AdminBrandDto } from "schemas";
import {
  deleteAdminBrand,
  fetchAdminBrands,
  restoreAdminBrand,
  type AdminCatalogListPage,
} from "@/lib/fetchers/admin-catalog";
import { useToastStore } from "@/stores/toast-store";
import { AdminCatalogTabs } from "./AdminCatalogTabs";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminBrandFormDialog } from "./AdminBrandFormDialog";

const PAGE_SIZE = 20;

export function AdminBrandsListContent() {
  const showToast = useToastStore((state) => state.show);
  const [q, setQ] = useState("");
  const [isOEM, setIsOEM] = useState<"" | "true" | "false">("");
  const [state, setState] = useState<"active" | "deleted">("active");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<AdminCatalogListPage<AdminBrandDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<AdminBrandDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminBrandDto | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void fetchAdminBrands(page + 1, PAGE_SIZE, {
        q: q || undefined,
        isOEM: isOEM || undefined,
        state,
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
  }, [page, q, isOEM, state, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  const handlePaginationModelChange = useCallback((model: GridPaginationModel) => {
    setLoading(true);
    setPage(model.page);
  }, []);

  async function handleDelete(): Promise<void> {
    if (!pendingDelete) return;
    setBusy(true);
    const response = await deleteAdminBrand(pendingDelete.id);
    setBusy(false);
    setPendingDelete(null);
    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast("برند حذف شد", "success");
    reload();
  }

  async function handleRestore(row: AdminBrandDto): Promise<void> {
    const response = await restoreAdminBrand(row.id);
    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast("برند بازگردانده شد", "success");
    reload();
  }

  const columns: GridColDef<AdminBrandDto>[] = [
    {
      field: "name",
      headerName: "نام",
      flex: 1.2,
      minWidth: 180,
      sortable: false,
      valueGetter: (_value, row) => row.name.fa,
    },
    { field: "slug", headerName: "نامک", flex: 1, minWidth: 150 },
    { field: "country", headerName: "کشور", width: 130 },
    {
      field: "isOEM",
      headerName: "اصلی",
      width: 110,
      sortable: false,
      renderCell: ({ row }) =>
        row.isOEM ? <Chip size="small" color="primary" label="OEM" /> : null,
    },
    {
      field: "productCount",
      headerName: "محصول",
      width: 100,
      valueGetter: (value: number) => toPersianDigits(value),
    },
    {
      field: "actions",
      headerName: "عملیات",
      width: 170,
      sortable: false,
      renderCell: ({ row }) =>
        state === "deleted" ? (
          <Button size="small" onClick={() => void handleRestore(row)}>
            بازگردانی
          </Button>
        ) : (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" onClick={() => setEditing(row)}>
              ویرایش
            </Button>
            <Button size="small" color="error" onClick={() => setPendingDelete(row)}>
              حذف
            </Button>
          </Stack>
        ),
    },
  ];

  return (
    <Stack spacing={2}>
      <AdminCatalogTabs active="brands" />

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
          برندها
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
          <TextField
            size="small"
            label="جست‌وجوی نام یا نامک"
            value={q}
            onChange={(event) => {
              setLoading(true);
              setPage(0);
              setQ(event.target.value);
            }}
          />
          <Select
            size="small"
            displayEmpty
            value={isOEM}
            inputProps={{ "aria-label": "فیلتر برند اصلی" }}
            onChange={(event) => {
              setLoading(true);
              setPage(0);
              setIsOEM(event.target.value as "" | "true" | "false");
            }}
          >
            <MenuItem value="">همه برندها</MenuItem>
            <MenuItem value="true">فقط OEM</MenuItem>
            <MenuItem value="false">غیر OEM</MenuItem>
          </Select>
          <Select
            size="small"
            value={state}
            inputProps={{ "aria-label": "وضعیت" }}
            onChange={(event) => {
              setLoading(true);
              setPage(0);
              setState(event.target.value as "active" | "deleted");
            }}
          >
            <MenuItem value="active">فعال</MenuItem>
            <MenuItem value="deleted">حذف‌شده</MenuItem>
          </Select>
          <Button variant="contained" onClick={() => setCreating(true)}>
            برند جدید
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
        disableRowSelectionOnClick
        autoHeight
      />

      {(creating || editing !== null) && (
        <AdminBrandFormDialog
          brand={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            reload();
          }}
        />
      )}

      <AdminConfirmDialog
        open={pendingDelete !== null}
        busy={busy}
        title="حذف برند"
        description={`«${pendingDelete?.name.fa ?? ""}» حذف شود؟ اگر محصولی به آن متصل باشد، حذف انجام نمی‌شود.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </Stack>
  );
}
