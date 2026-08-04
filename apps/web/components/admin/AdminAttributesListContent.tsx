"use client"; // Search, filters, pagination, and a create/edit dialog.

import { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { toPersianDigits, type AdminAttributeDto, type AttributeTypeDto } from "schemas";
import {
  deleteAdminAttribute,
  fetchAdminAttributes,
  restoreAdminAttribute,
  type AdminCatalogListPage,
} from "@/lib/fetchers/admin-catalog";
import { useToastStore } from "@/stores/toast-store";
import { AdminCatalogTabs } from "./AdminCatalogTabs";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminAttributeFormDialog } from "./AdminAttributeFormDialog";

const PAGE_SIZE = 20;

export const ATTRIBUTE_TYPE_LABELS: Record<AttributeTypeDto, string> = {
  select: "چندگزینه‌ای",
  number: "عدد",
  bool: "بله/خیر",
  text: "متن",
};

export function AdminAttributesListContent() {
  const showToast = useToastStore((state) => state.show);
  const [q, setQ] = useState("");
  const [type, setType] = useState<AttributeTypeDto | "">("");
  const [state, setState] = useState<"active" | "deleted">("active");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<AdminCatalogListPage<AdminAttributeDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<AdminAttributeDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminAttributeDto | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void fetchAdminAttributes(page + 1, PAGE_SIZE, {
        q: q || undefined,
        type: type || undefined,
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
  }, [page, q, type, state, reloadKey]);

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
    const response = await deleteAdminAttribute(pendingDelete.id);
    setBusy(false);
    setPendingDelete(null);
    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast("ویژگی حذف شد", "success");
    reload();
  }

  async function handleRestore(row: AdminAttributeDto): Promise<void> {
    const response = await restoreAdminAttribute(row.id);
    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast("ویژگی بازگردانده شد", "success");
    reload();
  }

  const columns: GridColDef<AdminAttributeDto>[] = [
    { field: "name", headerName: "نام", flex: 1.2, minWidth: 160 },
    { field: "key", headerName: "کلید", flex: 1, minWidth: 140 },
    {
      field: "type",
      headerName: "نوع",
      width: 140,
      renderCell: ({ row }) => <Chip size="small" label={ATTRIBUTE_TYPE_LABELS[row.type]} />,
    },
    { field: "unit", headerName: "واحد", width: 90 },
    {
      field: "options",
      headerName: "گزینه‌ها",
      flex: 1,
      minWidth: 160,
      sortable: false,
      valueGetter: (_value, row) => row.options.join("، "),
    },
    {
      field: "usageCount",
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

  const isEmpty = !loading && (result?.total ?? 0) === 0 && !q && !type && state === "active";

  return (
    <Stack spacing={2}>
      <AdminCatalogTabs active="attributes" />

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
          ویژگی‌ها
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
          <TextField
            size="small"
            label="جست‌وجوی نام یا کلید"
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
            value={type}
            inputProps={{ "aria-label": "فیلتر نوع ویژگی" }}
            onChange={(event) => {
              setLoading(true);
              setPage(0);
              setType(event.target.value as AttributeTypeDto | "");
            }}
          >
            <MenuItem value="">همه نوع‌ها</MenuItem>
            {(Object.keys(ATTRIBUTE_TYPE_LABELS) as AttributeTypeDto[]).map((value) => (
              <MenuItem key={value} value={value}>
                {ATTRIBUTE_TYPE_LABELS[value]}
              </MenuItem>
            ))}
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
            ویژگی جدید
          </Button>
        </Stack>
      </Box>

      {/* Says out loud what a staff member would otherwise have to discover:
          a definition here does nothing on its own until a product is given a
          value for it on the product edit page. */}
      {isEmpty && (
        <Typography variant="body2" color="text.secondary">
          هنوز هیچ ویژگی‌ای تعریف نشده است. ویژگی‌ها پس از تعریف، در صفحه ویرایش هر محصول قابل
          مقداردهی می‌شوند و همان مقادیر، فیلترهای دسته‌بندی و جدول مشخصات صفحه محصول را می‌سازند.
        </Typography>
      )}

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
        <AdminAttributeFormDialog
          attribute={editing}
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
        title="حذف ویژگی"
        description={`«${pendingDelete?.name ?? ""}» حذف شود؟ اگر محصولی از این ویژگی استفاده کند، حذف انجام نمی‌شود.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </Stack>
  );
}
