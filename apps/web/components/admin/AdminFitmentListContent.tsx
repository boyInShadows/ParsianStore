"use client"; // Filters, pagination and a create/edit dialog -- same
// reasoning as every other admin list screen.

import { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import {
  ADMIN_FITMENT_CONFIDENCES,
  toPersianDigits,
  type AdminFitmentDto,
  type AdminVehicleMakeDto,
} from "schemas";
import {
  deleteAdminFitment,
  fetchAdminFitments,
  fetchAdminMakes,
  restoreAdminFitment,
  type AdminVehicleListPage,
} from "@/lib/fetchers/admin-vehicles";
import { useToastStore } from "@/stores/toast-store";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminFitmentFormDialog, CONFIDENCE_LABELS } from "./AdminFitmentFormDialog";
import { AdminVehicleTabs } from "./AdminVehicleTabs";

const PAGE_SIZE = 20;

// §3.4's PDP verdict banner uses these three states, and staff scan this
// list for the ones that need checking -- so the colour carries the same
// meaning it does on the storefront rather than decorating.
const CONFIDENCE_TONE: Record<string, "success" | "info" | "warning"> = {
  exact: "success",
  likely: "info",
  check: "warning",
};

function vehicleLabel(row: AdminFitmentDto): string {
  const parts = [row.makeName, row.modelName];
  if (row.genName) parts.push(row.genName);
  if (row.engineCode) parts.push(row.engineCode);
  return parts.join(" · ");
}

export function AdminFitmentListContent() {
  const showToast = useToastStore((state) => state.show);
  const [makes, setMakes] = useState<AdminVehicleMakeDto[]>([]);
  const [makeId, setMakeId] = useState("");
  const [confidence, setConfidence] = useState("");
  const [state, setState] = useState<"active" | "deleted">("active");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<AdminVehicleListPage<AdminFitmentDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<AdminFitmentDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminFitmentDto | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminMakes().then((data) => {
      if (!cancelled) setMakes(data?.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminFitments(page + 1, PAGE_SIZE, {
      makeId: makeId || undefined,
      confidence: confidence || undefined,
      state,
    }).then((data) => {
      if (cancelled) return;
      setResult(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [page, makeId, confidence, state, reloadKey]);

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
    const response = await deleteAdminFitment(pendingDelete.id);
    setBusy(false);
    setPendingDelete(null);
    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast("رکورد سازگاری حذف شد", "success");
    reload();
  }

  async function handleRestore(row: AdminFitmentDto): Promise<void> {
    const response = await restoreAdminFitment(row.id);
    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast("رکورد سازگاری بازگردانده شد", "success");
    reload();
  }

  const columns: GridColDef<AdminFitmentDto>[] = [
    {
      field: "productName",
      headerName: "محصول",
      flex: 1.3,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
            {row.productName}
          </Typography>
          <Typography
            noWrap
            sx={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "text.secondary" }}
          >
            {row.productSku}
          </Typography>
        </Box>
      ),
    },
    {
      field: "vehicle",
      headerName: "خودرو",
      flex: 1.4,
      minWidth: 220,
      sortable: false,
      valueGetter: (_value, row) => vehicleLabel(row),
    },
    {
      field: "years",
      headerName: "سال‌ها",
      width: 140,
      sortable: false,
      valueGetter: (_value, row) =>
        `${toPersianDigits(row.yearFrom)} – ${
          row.yearTo === null ? "اکنون" : toPersianDigits(row.yearTo)
        }`,
    },
    {
      field: "confidence",
      headerName: "اطمینان",
      width: 140,
      sortable: false,
      renderCell: ({ row }) => (
        <Chip
          size="small"
          color={CONFIDENCE_TONE[row.confidence] ?? "default"}
          label={CONFIDENCE_LABELS[row.confidence] ?? row.confidence}
        />
      ),
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
    <Stack spacing={2.5}>
      <AdminVehicleTabs active="fitment" />

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "clamp(1.5rem, 1.2rem + 1vw, 2rem)",
              lineHeight: 1.2,
            }}
          >
            مدیریت سازگاری
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: "0.875rem", color: "text.secondary" }}>
            این رکوردها تعیین می‌کنند هر قطعه روی چه خودروهایی می‌نشیند
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
          <TextField
            select
            size="small"
            label="برند خودرو"
            value={makeId}
            onChange={(event) => {
              setLoading(true);
              setPage(0);
              setMakeId(event.target.value);
            }}
            sx={{ minWidth: 170, bgcolor: "background.paper" }}
          >
            <MenuItem value="">همه برندها</MenuItem>
            {makes.map((make) => (
              <MenuItem key={make.id} value={make.id}>
                {make.name.fa}
              </MenuItem>
            ))}
          </TextField>
          <Select
            size="small"
            displayEmpty
            value={confidence}
            inputProps={{ "aria-label": "فیلتر میزان اطمینان" }}
            onChange={(event) => {
              setLoading(true);
              setPage(0);
              setConfidence(event.target.value);
            }}
            sx={{ minWidth: 160, bgcolor: "background.paper" }}
          >
            <MenuItem value="">همه سطوح</MenuItem>
            {ADMIN_FITMENT_CONFIDENCES.map((value) => (
              <MenuItem key={value} value={value}>
                {CONFIDENCE_LABELS[value] ?? value}
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
            sx={{ bgcolor: "background.paper" }}
          >
            <MenuItem value="active">فعال</MenuItem>
            <MenuItem value="deleted">حذف‌شده</MenuItem>
          </Select>
          <Button variant="contained" onClick={() => setCreating(true)}>
            سازگاری جدید
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
        rowHeight={64}
      />

      {(creating || editing !== null) && (
        <AdminFitmentFormDialog
          fitment={editing}
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
        title="حذف رکورد سازگاری"
        description={`سازگاری «${pendingDelete?.productName ?? ""}» با «${
          pendingDelete ? vehicleLabel(pendingDelete) : ""
        }» حذف شود؟ پس از این، این قطعه دیگر برای آن خودرو پیشنهاد نمی‌شود.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </Stack>
  );
}
