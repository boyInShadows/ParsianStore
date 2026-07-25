"use client";

import { useState } from "react";
import { Box, Button, Stack, TextField, Typography, useTheme } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { faIR as datePickersFaIR } from "@mui/x-date-pickers/locales";
import { BarChart } from "@mui/x-charts/BarChart";
import dayjs, { type Dayjs } from "dayjs";

// Demo page proving the (admin) route group's MUI + RTL + cascade-layer
// wiring (P1.S6). Replaced by the real Fitment Manager / product tables in
// Phase 8. Sample rows are real Persian part names, not lorem/placeholder text.
const rows = [
  { id: 1, name: "لنت ترمز جلو", sku: "MB-0442-K", stock: 128 },
  { id: 2, name: "فیلتر روغن", sku: "OF-1187-S", stock: 342 },
  { id: 3, name: "دیسک ترمز عقب", sku: "BD-0973-R", stock: 46 },
  { id: 4, name: "تسمه تایم", sku: "TB-2210-P", stock: 19 },
];

const columns: GridColDef[] = [
  { field: "name", headerName: "نام قطعه", flex: 1 },
  { field: "sku", headerName: "کد فنی", flex: 1 },
  { field: "stock", headerName: "موجودی", type: "number", flex: 1 },
];

const weeklyStock = [
  { week: "هفته ۱", count: 210 },
  { week: "هفته ۲", count: 260 },
  { week: "هفته ۳", count: 190 },
  { week: "هفته ۴", count: 300 },
];

export default function AdminDemoPage() {
  const [partName, setPartName] = useState("");
  const [entryDate, setEntryDate] = useState<Dayjs | null>(dayjs());
  const theme = useTheme();

  return (
    <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 4 }}>
      <Typography variant="h4" component="h1">
        نمای کلی انبار
      </Typography>

      <Box sx={{ height: 320 }}>
        <DataGrid rows={rows} columns={columns} disableRowSelectionOnClick />
      </Box>

      <Stack
        component="form"
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        onSubmit={(event) => event.preventDefault()}
      >
        <TextField
          label="نام قطعه جدید"
          value={partName}
          onChange={(event) => setPartName(event.target.value)}
        />
        <LocalizationProvider
          dateAdapter={AdapterDayjs}
          localeText={datePickersFaIR.components.MuiLocalizationProvider.defaultProps.localeText}
        >
          <DatePicker label="تاریخ ورود به انبار" value={entryDate} onChange={setEntryDate} />
        </LocalizationProvider>
        <Button type="submit" variant="contained">
          ثبت
        </Button>
      </Stack>

      <Box>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          موجودی هفتگی
        </Typography>
        <BarChart
          height={260}
          dataset={weeklyStock}
          xAxis={[{ dataKey: "week", scaleType: "band" }]}
          series={[{ dataKey: "count", label: "تعداد" }]}
          // X-Charts ships its own default series palette, independent of
          // the MUI theme, unless told otherwise -- without this the chart
          // silently ignores our brand color (found re-verifying P1.S6
          // after the P1.S9 palette swap: the bars stayed the old
          // turquoise-ish default even though the theme's primary changed).
          colors={[theme.palette.primary.main]}
        />
      </Box>
    </Box>
  );
}
