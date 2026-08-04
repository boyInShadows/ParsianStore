"use client"; // Rendered inside the client-side dashboard shell; the rows
// below carry real hover/focus treatment.

import type { ReactNode } from "react";
import { Box, Chip, Paper, Stack, Typography, alpha } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import {
  formatJalali,
  formatToman,
  toPersianDigits,
  type AdminDashboardDto,
  type OrderStatusDto,
} from "schemas";
import { Link } from "@/i18n/navigation";

/**
 * P8.S5 panel primitives. Split out of AdminDashboardContent so neither
 * file grows past the size this repo keeps modules to, and so the panel
 * chrome (header rule, padding rhythm, empty state) is defined once
 * instead of copy-pasted five times.
 */

const EMPTY_HINT = "در این بازه داده‌ای ثبت نشده است";

export function AdminPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: 1,
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          px: 2.5,
          py: 1.75,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography
          component="h2"
          sx={{ fontSize: "0.9375rem", fontWeight: 700, letterSpacing: "0.01em" }}
        >
          {title}
        </Typography>
        {action ? (
          <Typography
            component={Link}
            href={action.href}
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "primary.main",
              textDecoration: "none",
              borderRadius: 1,
              "&:hover": { textDecoration: "underline" },
              "&:focus-visible": { outline: 2, outlineColor: "primary.main", outlineOffset: 2 },
            }}
          >
            {action.label}
          </Typography>
        ) : null}
      </Stack>
      <Box sx={{ flex: 1, p: 1 }}>{children}</Box>
    </Paper>
  );
}

function EmptyRow({ hint = EMPTY_HINT }: { hint?: string }) {
  return (
    <Typography sx={{ p: 2.5, fontSize: "0.875rem", color: "text.secondary" }}>{hint}</Typography>
  );
}

const rowSx = {
  display: "flex",
  alignItems: "center",
  gap: 1.5,
  position: "relative",
  px: 1.5,
  py: 1.25,
  borderRadius: 1,
  transition: "background-color 160ms ease",
  "&:hover": { bgcolor: "action.hover" },
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
} as const;

const numeralSx = {
  fontFamily: "var(--font-display)",
  fontWeight: 900,
  lineHeight: 1,
} as const;

// ---------------------------------------------------------------------------

export function TopProductsPanel({ rows }: { rows: AdminDashboardDto["topProducts"] }) {
  if (rows.length === 0) return <EmptyRow />;
  const max = Math.max(...rows.map((row) => row.qty));

  return (
    <Stack>
      {rows.map((row, index) => (
        <Box key={row.productId} sx={rowSx}>
          {/* The share bar sits behind the row rather than beside it -- the
              ranking is readable at a glance without a separate chart, and
              the layering is what keeps this from being a plain list. */}
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              insetBlock: 4,
              insetInlineStart: 0,
              inlineSize: `${Math.round((row.qty / max) * 100)}%`,
              borderRadius: 1,
              bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.1),
            }}
          />
          <Box
            aria-hidden="true"
            sx={{
              ...numeralSx,
              position: "relative",
              flexShrink: 0,
              inlineSize: 26,
              blockSize: 26,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              fontSize: "0.8125rem",
              color: index === 0 ? "primary.contrastText" : "text.secondary",
              bgcolor: index === 0 ? "primary.main" : "action.selected",
            }}
          >
            {toPersianDigits(index + 1)}
          </Box>
          <Box sx={{ position: "relative", minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
              {row.name}
            </Typography>
            <Typography
              noWrap
              sx={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "text.secondary" }}
            >
              {row.sku}
            </Typography>
          </Box>
          <Box sx={{ position: "relative", textAlign: "end", flexShrink: 0 }}>
            <Typography sx={{ ...numeralSx, fontSize: "1rem" }}>
              {toPersianDigits(row.qty)}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              {formatToman(row.revenueRial)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

// ---------------------------------------------------------------------------

export function LowStockPanel({ rows }: { rows: AdminDashboardDto["lowStockProducts"] }) {
  if (rows.length === 0) {
    return <EmptyRow hint="موجودی هیچ محصولی به آستانه هشدار نرسیده است" />;
  }

  return (
    <Stack>
      {rows.map((row) => {
        const isOut = row.stock === 0;
        // Against the product's OWN threshold, not a global one -- a part
        // with lowStockAt=50 at 40 units is genuinely low, and a shared
        // scale would hide that.
        const ratio = row.lowStockAt === 0 ? 0 : Math.min(row.stock / row.lowStockAt, 1);
        return (
          <Box key={row.id} sx={rowSx}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
                {row.name}
              </Typography>
              <Box
                sx={{
                  mt: 0.75,
                  blockSize: 4,
                  borderRadius: 999,
                  bgcolor: "action.selected",
                  overflow: "hidden",
                }}
              >
                <Box
                  aria-hidden="true"
                  sx={{
                    blockSize: "100%",
                    inlineSize: `${Math.round(ratio * 100)}%`,
                    borderRadius: 999,
                    bgcolor: isOut ? "error.main" : "warning.main",
                  }}
                />
              </Box>
            </Box>
            <Stack sx={{ alignItems: "flex-end", flexShrink: 0 }}>
              <Typography
                sx={{
                  ...numeralSx,
                  fontSize: "1rem",
                  color: isOut ? "error.main" : "warning.main",
                }}
              >
                {toPersianDigits(row.stock)}
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                آستانه {toPersianDigits(row.lowStockAt)}
              </Typography>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

// ---------------------------------------------------------------------------

const STATUS_TONE: Record<OrderStatusDto, "default" | "info" | "success" | "error"> = {
  pending: "default",
  paid: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "error",
  refunded: "error",
};

export function RecentOrdersPanel({
  rows,
  statusLabel,
}: {
  rows: AdminDashboardDto["recentOrders"];
  statusLabel: (status: string) => string;
}) {
  if (rows.length === 0) return <EmptyRow hint="هنوز سفارشی ثبت نشده است" />;

  return (
    <Stack>
      {rows.map((row) => (
        <Box
          key={row.id}
          component={Link}
          href={`/admin/orders/${row.id}`}
          sx={{
            ...rowSx,
            color: "inherit",
            textDecoration: "none",
            "&:focus-visible": { outline: 2, outlineColor: "primary.main", outlineOffset: -2 },
          }}
        >
          <Typography
            sx={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {toPersianDigits(row.code)}
          </Typography>
          <Chip
            size="small"
            color={STATUS_TONE[row.status as OrderStatusDto] ?? "default"}
            label={statusLabel(row.status)}
            sx={{ flexShrink: 0 }}
          />
          <Typography
            sx={{ flex: 1, textAlign: "end", fontSize: "0.8125rem", color: "text.secondary" }}
          >
            {formatJalali(row.createdAt, "D MMMM")}
          </Typography>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, flexShrink: 0 }}>
            {formatToman(row.totalRial)}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
