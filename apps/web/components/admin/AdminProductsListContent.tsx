"use client"; // DataGrid pagination + status filter + row-click navigation, all client state

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Select,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { formatToman, type ProductStatusDto } from "schemas";
import { useRouter } from "@/i18n/navigation";
import {
  fetchAdminProducts,
  importAdminProducts,
  type AdminProductListPage,
  type ProductImportResult,
} from "@/lib/fetchers/admin-products";

const STATUS_LABEL: Record<ProductStatusDto, string> = {
  draft: "پیش‌نویس",
  active: "فعال",
  archived: "بایگانی‌شده",
};

const STATUS_TONE: Record<ProductStatusDto, "default" | "success" | "warning"> = {
  draft: "default",
  active: "success",
  archived: "warning",
};

const PAGE_SIZE = 20;

export function AdminProductsListContent() {
  const router = useRouter();
  const [status, setStatus] = useState<ProductStatusDto | "">("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<AdminProductListPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [importFile, setImportFile] = useState<File>();
  const [importResult, setImportResult] = useState<ProductImportResult>();
  const [importing, setImporting] = useState(false);

  async function runImport(commit: boolean) {
    if (!importFile) return;
    setImporting(true);
    const response = await importAdminProducts(importFile, commit);
    setImporting(false);
    if (response.ok) {
      setImportResult(response.data);
      if (response.data.imported) {
        setLoading(true);
        setPage(0);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    void fetchAdminProducts(page + 1, PAGE_SIZE, status || undefined).then((data) => {
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
    setStatus(event.target.value as ProductStatusDto | "");
    setPage(0);
  }

  function handlePaginationModelChange(model: { page: number }): void {
    setLoading(true);
    setPage(model.page);
  }

  const columns: GridColDef[] = [
    { field: "sku", headerName: "کد کالا", flex: 1, minWidth: 120 },
    {
      field: "name",
      headerName: "نام کالا",
      flex: 1.5,
      minWidth: 180,
      valueGetter: (value: { fa: string }) => value?.fa ?? "",
    },
    {
      field: "status",
      headerName: "وضعیت",
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        <Chip
          label={STATUS_LABEL[params.value as ProductStatusDto]}
          color={STATUS_TONE[params.value as ProductStatusDto]}
          size="small"
        />
      ),
    },
    {
      field: "priceRial",
      headerName: "قیمت",
      flex: 1,
      minWidth: 140,
      valueFormatter: (value: number) => formatToman(value),
    },
    {
      field: "stock",
      headerName: "موجودی",
      type: "number",
      width: 110,
      renderCell: (params) => {
        const low = params.row.stock <= params.row.lowStockAt;
        return (
          <Typography
            component="span"
            color={low ? "error" : undefined}
            sx={low ? { fontWeight: 700 } : undefined}
          >
            {params.value}
          </Typography>
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          محصولات
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Select
            size="small"
            value={status}
            onChange={handleStatusChange}
            displayEmpty
            inputProps={{ "aria-label": "فیلتر وضعیت محصول" }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">همه وضعیت‌ها</MenuItem>
            {(Object.keys(STATUS_LABEL) as ProductStatusDto[]).map((value) => (
              <MenuItem key={value} value={value}>
                {STATUS_LABEL[value]}
              </MenuItem>
            ))}
          </Select>
          <Button variant="contained" onClick={() => router.push("/admin/products/new")}>
            افزودن محصول
          </Button>
        </Box>
      </Box>
      <Box sx={{ mb: 2, p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          ورود گروهی CSV
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ستون‌ها: nameFa, nameEn, slug, sku, brandId, categoryId, priceRial, stock, weightGram,
          supplyRoute, sourceBrand, countryOfManufacture, verificationCode
        </Typography>
        <Button component="label" variant="outlined">
          انتخاب CSV
          <input
            hidden
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              setImportFile(event.target.files?.[0]);
              setImportResult(undefined);
            }}
          />
        </Button>
        <Button
          sx={{ ml: 1 }}
          disabled={!importFile || importing}
          onClick={() => void runImport(false)}
        >
          اعتبارسنجی
        </Button>
        {importResult ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              {importResult.valid} از {importResult.total} ردیف معتبر؛ {importResult.imported} وارد
              شد.
            </Typography>
            {importResult.rows.some((row) => !row.ok) ? (
              <Typography variant="body2" color="error">
                {importResult.rows
                  .filter((row) => !row.ok)
                  .map((row) => `ردیف ${row.row}: ${row.errors.join("، ")}`)
                  .join(" | ")}
              </Typography>
            ) : (
              <Button
                variant="contained"
                disabled={importing || importResult.imported > 0}
                onClick={() => void runImport(true)}
              >
                ثبت همه ردیف‌ها
              </Button>
            )}
          </Box>
        ) : null}
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
        onRowClick={(params) => router.push(`/admin/products/${params.id}`)}
        sx={{ cursor: "pointer" }}
        disableRowSelectionOnClick
        autoHeight
      />
    </Box>
  );
}
