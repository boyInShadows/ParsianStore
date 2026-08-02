"use client"; // Search, filters, pagination, and a create/edit dialog.

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { CATALOG_SYSTEMS, toPersianDigits, type AdminCategoryDto } from "schemas";
import {
  deleteAdminCategory,
  fetchAdminCategories,
  restoreAdminCategory,
  type AdminCatalogListPage,
} from "@/lib/fetchers/admin-catalog";
import { useToastStore } from "@/stores/toast-store";
import { AdminCatalogTabs } from "./AdminCatalogTabs";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminCategoryFormDialog } from "./AdminCategoryFormDialog";

const PAGE_SIZE = 20;

export function AdminCategoriesListContent() {
  const showToast = useToastStore((state) => state.show);
  const [q, setQ] = useState("");
  const [systemCode, setSystemCode] = useState("");
  const [state, setState] = useState<"active" | "deleted">("active");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<AdminCatalogListPage<AdminCategoryDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<AdminCategoryDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminCategoryDto | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void fetchAdminCategories(page + 1, PAGE_SIZE, {
        q: q || undefined,
        systemCode: systemCode || undefined,
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
  }, [page, q, systemCode, state, reloadKey]);

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
    const response = await deleteAdminCategory(pendingDelete.id);
    setBusy(false);
    setPendingDelete(null);
    if (!response.ok) {
      // The server's own refusal, naming the real blocker and its count.
      showToast(response.message, "danger");
      return;
    }
    showToast("دسته‌بندی حذف شد", "success");
    reload();
  }

  async function handleRestore(row: AdminCategoryDto): Promise<void> {
    const response = await restoreAdminCategory(row.id);
    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast("دسته‌بندی بازگردانده شد", "success");
    reload();
  }

  const columns: GridColDef<AdminCategoryDto>[] = [
    {
      field: "name",
      headerName: "نام",
      flex: 1.4,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => (
        // Indent by materialized depth — cheap, and it reads as a tree
        // without needing MUI X Pro's treeData (which is a paid tier).
        // `paddingInlineStart`, not the `ps` shorthand: MUI System 7 only
        // registers `pl`/`pr` as spacing shorthands, so `ps` is silently
        // dropped — and `pl` is both physical (CLAUDE.md rule 6) and simply
        // the wrong edge in RTL. Same explicit-logical-property style
        // AdminShell's own `borderInlineEnd` already uses.
        <Box sx={{ paddingInlineStart: row.depth * 2 }}>
          {row.ancestorNames.length > 0 && (
            <Typography variant="caption" color="text.secondary" component="span">
              {row.ancestorNames.join(" / ")} /{" "}
            </Typography>
          )}
          <Typography variant="body2" component="span">
            {row.name.fa}
          </Typography>
        </Box>
      ),
    },
    { field: "slug", headerName: "نامک", flex: 1, minWidth: 150 },
    {
      field: "systemCode",
      headerName: "سیستم",
      width: 150,
      renderCell: ({ row }) => (
        <Chip
          size="small"
          label={
            CATALOG_SYSTEMS.find((system) => system.code === row.systemCode)?.name.fa ??
            row.systemCode
          }
        />
      ),
    },
    {
      field: "childCount",
      headerName: "زیرمجموعه",
      width: 110,
      valueGetter: (value: number) => toPersianDigits(value),
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
            {/* The button stays enabled when the row is in use: the server's
                own refusal explains exactly what blocks it, which is more
                useful than a silently disabled control.

                `describeChild` matters here. MUI's Tooltip defaults to acting
                as the child's accessible NAME, so without it this button
                announces as "این دسته‌بندی در حال استفاده است" instead of
                "حذف" — the hint replacing the action. axe does not flag it
                (the button still has *a* name); it surfaced because a
                name-based locator could not find the delete button at all. */}
            <Tooltip
              describeChild
              title={
                row.productCount > 0 || row.childCount > 0 ? "این دسته‌بندی در حال استفاده است" : ""
              }
            >
              <Button size="small" color="error" onClick={() => setPendingDelete(row)}>
                حذف
              </Button>
            </Tooltip>
          </Stack>
        ),
    },
  ];

  return (
    <Stack spacing={2}>
      <AdminCatalogTabs active="categories" />

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
          دسته‌بندی‌ها
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
            value={systemCode}
            inputProps={{ "aria-label": "فیلتر سیستم" }}
            onChange={(event) => {
              setLoading(true);
              setPage(0);
              setSystemCode(event.target.value);
            }}
          >
            <MenuItem value="">همه سیستم‌ها</MenuItem>
            {CATALOG_SYSTEMS.map((system) => (
              <MenuItem key={system.code} value={system.code}>
                {system.name.fa}
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
            دسته‌بندی جدید
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
        <AdminCategoryFormDialog
          category={editing}
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
        title="حذف دسته‌بندی"
        description={`«${pendingDelete?.name.fa ?? ""}» حذف شود؟ اگر محصول یا زیرمجموعه‌ای به آن متصل باشد، حذف انجام نمی‌شود.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </Stack>
  );
}
