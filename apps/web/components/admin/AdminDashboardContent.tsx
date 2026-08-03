"use client"; // Range toggle, client-side refetch, and MUI X Charts (which
// measure the DOM) -- none of this can run as a Server Component.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Box,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
} from "@mui/material";
import { useTheme, type Theme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import {
  formatJalali,
  formatToman,
  toPersianDigits,
  type AdminDashboardDto,
  type DashboardRangeDto,
} from "schemas";
import { Link } from "@/i18n/navigation";
import { fetchAdminDashboard } from "@/lib/fetchers/admin-dashboard";
import { AdminStatTile, toDelta } from "./AdminStatTile";
import {
  AdminPanel,
  LowStockPanel,
  RecentOrdersPanel,
  TopProductsPanel,
} from "./AdminDashboardPanels";

const RANGES: { value: DashboardRangeDto; label: string }[] = [
  { value: "7d", label: "۷ روز" },
  { value: "30d", label: "۳۰ روز" },
  { value: "90d", label: "۹۰ روز" },
];

const RANGE_CAPTION: Record<DashboardRangeDto, string> = {
  "7d": "نسبت به ۷ روز پیش از آن",
  "30d": "نسبت به ۳۰ روز پیش از آن",
  "90d": "نسبت به ۹۰ روز پیش از آن",
};

/**
 * A 12-column bento rather than a row of equal cards: the revenue tile
 * spans half the width and two rows, so the eye lands on it first
 * (web/design-quality.md -- hierarchy through scale, grid-breaking
 * composition, no uniform card grid). Every span collapses to full width
 * below `md` so the same markup works at 360px.
 */
function span(desktop: number, tablet = 6) {
  return { gridColumn: { xs: "span 12", md: `span ${tablet}`, lg: `span ${desktop}` } };
}

const GRID_SX = {
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  gap: 2,
} as const;

type ActionTone = "warning" | "info" | "error";

function NeedsActionCard({
  tone,
  count,
  label,
  hint,
  href,
}: {
  tone: ActionTone;
  count: number;
  label: string;
  hint: string;
  href: string;
}) {
  const isIdle = count === 0;
  return (
    <Paper
      elevation={0}
      component={Link}
      href={href}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 2,
        textDecoration: "none",
        color: "inherit",
        border: 1,
        borderColor: "divider",
        // The accent lives on the inline-start edge, which is the RIGHT
        // edge in RTL -- `borderInlineStartWidth`, never `borderLeft`.
        borderInlineStartWidth: 4,
        borderInlineStartColor: isIdle ? "divider" : `${tone}.main`,
        transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 2, borderColor: `${tone}.main` },
        "&:focus-visible": { outline: 2, outlineColor: "primary.main", outlineOffset: 2 },
        "@media (prefers-reduced-motion: reduce)": {
          transition: "none",
          "&:hover": { transform: "none" },
        },
      }}
    >
      <Typography
        sx={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "1.75rem",
          lineHeight: 1,
          color: isIdle ? "text.disabled" : `${tone}.main`,
        }}
      >
        {toPersianDigits(count)}
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>{label}</Typography>
        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{hint}</Typography>
      </Box>
    </Paper>
  );
}

/**
 * Derived from the theme so the wedges stay in the same colour family as
 * the rest of the screen and both light and dark get their own set -- no
 * palette hardcoded here (CLAUDE.md rule 5). Shared by the chart and the
 * hand-rolled legend beside it, which is the only way the two can be
 * guaranteed to agree.
 */
function wedgeColors(theme: Theme): string[] {
  return [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
    alpha(theme.palette.primary.main, 0.55),
    alpha(theme.palette.text.secondary, 0.5),
  ];
}

function StatusLegend({
  rows,
  colors,
  statusLabel,
}: {
  rows: AdminDashboardDto["statusBreakdown"];
  colors: string[];
  statusLabel: (status: string) => string;
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <Stack spacing={0.75} sx={{ minWidth: 150 }}>
      {rows.map((row, index) => (
        <Stack key={row.status} direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <Box
            aria-hidden="true"
            sx={{
              inlineSize: 10,
              blockSize: 10,
              borderRadius: "50%",
              flexShrink: 0,
              bgcolor: colors[index % colors.length],
            }}
          />
          <Typography sx={{ fontSize: "0.8125rem", flex: 1 }}>{statusLabel(row.status)}</Typography>
          <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700 }}>
            {toPersianDigits(row.count)}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", minWidth: 38 }}>
            {toPersianDigits(Math.round((row.count / total) * 100))}٪
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function LoadingGrid() {
  return (
    <Box sx={GRID_SX}>
      <Box sx={span(6)}>
        <Skeleton variant="rounded" height={220} />
      </Box>
      {[0, 1, 2, 3].map((key) => (
        <Box key={key} sx={span(3)}>
          <Skeleton variant="rounded" height={102} />
        </Box>
      ))}
      <Box sx={span(12, 12)}>
        <Skeleton variant="rounded" height={320} />
      </Box>
    </Box>
  );
}

export function AdminDashboardContent() {
  const tStatus = useTranslations("Orders.status");
  // MUI X Charts otherwise falls back to its own default palette (a teal
  // that appears nowhere else in this product), so the brand colour is
  // read off the theme and handed to every series explicitly.
  const accent = useTheme().palette.primary.main;
  const [range, setRange] = useState<DashboardRangeDto>("30d");
  const [data, setData] = useState<AdminDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // `loading` is flipped by whoever changes `range` (and starts true),
    // never here -- a synchronous setState inside an effect body is a
    // cascading render the lint rule rightly refuses.
    void fetchAdminDashboard(range).then((result) => {
      if (cancelled) return;
      setData(result);
      setFailed(result === null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  // next-intl throws on an unknown key, and `status` is a plain string off
  // the wire -- a status this build doesn't know about must degrade to the
  // raw value, not crash the whole dashboard.
  function statusLabel(status: string): string {
    return tStatus.has(status) ? tStatus(status) : status;
  }

  const header = (
    <Stack
      direction="row"
      sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}
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
          نمای کلی فروشگاه
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: "0.875rem", color: "text.secondary" }}>
          {RANGE_CAPTION[range]}
        </Typography>
      </Box>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={range}
        aria-label="بازه زمانی"
        sx={{
          // MUI's default group renders the three options with almost no
          // visible separation once they sit on the page background -- a
          // real surface plus a solid selected state makes the control read
          // as a segmented switch instead of one run-on word.
          bgcolor: "background.paper",
          "& .MuiToggleButton-root": {
            paddingInline: 2,
            fontWeight: 700,
            borderColor: "divider",
          },
          "& .MuiToggleButton-root.Mui-selected": {
            bgcolor: "primary.main",
            color: "primary.contrastText",
            "&:hover": { bgcolor: "primary.dark" },
          },
        }}
        onChange={(_event, next: DashboardRangeDto | null) => {
          // null = the active button was clicked again; keep the current
          // range rather than leaving the group with nothing selected.
          if (!next || next === range) return;
          setLoading(true);
          setRange(next);
        }}
      >
        {RANGES.map((option) => (
          <ToggleButton key={option.value} value={option.value}>
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );

  if (loading || !data) {
    return (
      <Stack spacing={3}>
        {header}
        {failed ? (
          <Typography sx={{ color: "error.main" }}>
            خواندن آمار داشبورد ممکن نشد. صفحه را دوباره بارگذاری کنید.
          </Typography>
        ) : (
          <LoadingGrid />
        )}
      </Stack>
    );
  }

  const trendLabels = data.trend.map((point) => formatJalali(point.day, "D MMM"));
  const trendRevenue = data.trend.map((point) => point.revenueRial);
  // ~8 labels regardless of range, so the 90-day axis doesn't turn into an
  // unreadable smear of overlapping Persian dates.
  const labelStep = Math.max(1, Math.ceil(data.trend.length / 8));

  return (
    <Stack spacing={3}>
      {header}

      <Box sx={GRID_SX}>
        {/* Two grid rows tall, so the four small tiles stack 2x2 beside it
            and the row reads 1+4 rather than five equal boxes. */}
        <Box sx={{ ...span(6), gridRow: { lg: "span 2" } }}>
          <AdminStatTile
            emphasis="hero"
            label="درآمد بازه"
            value={formatToman(data.totals.revenueRial)}
            delta={toDelta(data.totals.revenueRial, data.previousTotals.revenueRial)}
            caption={`پیش از این ${formatToman(data.previousTotals.revenueRial)}`}
            visual={
              <SparkLineChart
                data={trendRevenue}
                height={72}
                area
                showHighlight
                curve="monotoneX"
                colors={[accent]}
                margin={{ top: 4, bottom: 0, left: 0, right: 0 }}
              />
            }
          />
        </Box>
        <Box sx={span(3)}>
          <AdminStatTile
            label="سفارش‌های موفق"
            value={toPersianDigits(data.totals.orderCount)}
            delta={toDelta(data.totals.orderCount, data.previousTotals.orderCount)}
          />
        </Box>
        <Box sx={span(3)}>
          <AdminStatTile
            label="میانگین سبد"
            value={formatToman(data.totals.averageOrderRial)}
            delta={toDelta(data.totals.averageOrderRial, data.previousTotals.averageOrderRial)}
          />
        </Box>
        <Box sx={span(3)}>
          <AdminStatTile
            label="مشتری تازه"
            value={toPersianDigits(data.totals.newCustomers)}
            delta={toDelta(data.totals.newCustomers, data.previousTotals.newCustomers)}
          />
        </Box>
        <Box sx={span(3)}>
          <AdminStatTile
            label="کل سفارش‌های بازه"
            value={toPersianDigits(data.statusBreakdown.reduce((sum, row) => sum + row.count, 0))}
            caption="شامل لغوشده و در انتظار"
          />
        </Box>
      </Box>

      <Box>
        <Typography
          component="h2"
          sx={{
            mb: 1.5,
            fontSize: "0.8125rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "text.secondary",
          }}
        >
          نیازمند رسیدگی
        </Typography>
        <Box sx={GRID_SX}>
          <Box sx={span(4)}>
            <NeedsActionCard
              tone="warning"
              count={data.needsAction.pendingOrders}
              label="سفارش در انتظار پرداخت"
              hint="بدون محدودیت بازه زمانی"
              href="/admin/orders"
            />
          </Box>
          <Box sx={span(4)}>
            <NeedsActionCard
              tone="info"
              count={data.needsAction.processingOrders}
              label="سفارش در حال آماده‌سازی"
              hint="آماده ارسال شود"
              href="/admin/orders"
            />
          </Box>
          <Box sx={span(4)}>
            <NeedsActionCard
              tone="error"
              count={data.needsAction.lowStockProducts}
              label="محصول کم‌موجودی"
              hint="زیر آستانه هشدار خودش"
              href="/admin/products"
            />
          </Box>
        </Box>
      </Box>

      <Box sx={GRID_SX}>
        <Box sx={span(8, 12)}>
          <AdminPanel title="روند درآمد روزانه">
            <BarChart
              height={300}
              margin={{ top: 16, bottom: 40, left: 16, right: 16 }}
              xAxis={[
                {
                  scaleType: "band",
                  data: trendLabels,
                  tickLabelInterval: (_value, index) => index % labelStep === 0,
                },
              ]}
              yAxis={[{ valueFormatter: (value: number) => toPersianDigits(value / 10) }]}
              series={[
                {
                  data: trendRevenue,
                  label: "درآمد",
                  color: accent,
                  valueFormatter: (value) => (value === null ? "—" : formatToman(value)),
                },
              ]}
              slotProps={{ legend: { hidden: true } }}
              borderRadius={4}
            />
          </AdminPanel>
        </Box>
        <Box sx={span(4, 12)}>
          <AdminPanel title="ترکیب وضعیت سفارش‌ها">
            <StatusDonut rows={data.statusBreakdown} statusLabel={statusLabel} />
          </AdminPanel>
        </Box>
      </Box>

      <Box sx={GRID_SX}>
        <Box sx={span(6)}>
          <AdminPanel
            title="پرفروش‌ترین قطعات"
            action={{ href: "/admin/products", label: "محصولات" }}
          >
            <TopProductsPanel rows={data.topProducts} />
          </AdminPanel>
        </Box>
        <Box sx={span(6)}>
          <AdminPanel
            title="کم‌موجودی"
            action={{ href: "/admin/products", label: "مدیریت موجودی" }}
          >
            <LowStockPanel rows={data.lowStockProducts} />
          </AdminPanel>
        </Box>
        <Box sx={span(12, 12)}>
          <AdminPanel
            title="آخرین سفارش‌ها"
            action={{ href: "/admin/orders", label: "همه سفارش‌ها" }}
          >
            <RecentOrdersPanel rows={data.recentOrders} statusLabel={statusLabel} />
          </AdminPanel>
        </Box>
      </Box>
    </Stack>
  );
}

function StatusDonut({
  rows,
  statusLabel,
}: {
  rows: AdminDashboardDto["statusBreakdown"];
  statusLabel: (status: string) => string;
}) {
  // MUI X Charts' own `colors` callback receives the palette MODE, not the
  // theme, so the array is resolved here and shared with the legend --
  // that is also what guarantees chart and legend can never disagree.
  const colors = wedgeColors(useTheme());

  if (rows.length === 0) {
    return (
      <Typography sx={{ p: 2.5, fontSize: "0.875rem", color: "text.secondary" }}>
        در این بازه سفارشی ثبت نشده است
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        p: 1.5,
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        <PieChart
          width={190}
          height={190}
          colors={colors}
          margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
          series={[
            {
              innerRadius: 52,
              outerRadius: 88,
              paddingAngle: 2,
              cornerRadius: 4,
              data: rows.map((row, index) => ({
                id: index,
                value: row.count,
                label: statusLabel(row.status),
              })),
            },
          ]}
          slotProps={{ legend: { hidden: true } }}
        />
      </Box>
      <StatusLegend rows={rows} colors={colors} statusLabel={statusLabel} />
    </Box>
  );
}
