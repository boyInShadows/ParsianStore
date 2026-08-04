"use client"; // Filters, pagination and per-row expansion -- all client
// state, same as every other admin list screen.

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Collapse,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";
import {
  AUDIT_ENTITIES,
  AUDIT_METHODS,
  formatJalali,
  toPersianDigits,
  type AdminAuditLogDto,
  type AuditMethodDto,
} from "schemas";
import { fetchAdminAuditLogs, type AdminAuditPage } from "@/lib/fetchers/admin-audit";

const PAGE_SIZE = 25;

const ENTITY_LABELS: Record<string, string> = {
  order: "سفارش",
  product: "محصول",
  inventory: "موجودی",
  category: "دسته‌بندی",
  brand: "برند",
  attribute: "ویژگی",
  coupon: "کد تخفیف",
  customer: "مشتری",
};

/**
 * A create, an edit and a delete are not the same event, and staff scan
 * this screen for the destructive ones. Colour carries that meaning here
 * rather than decorating (web/design-quality.md).
 */
const METHOD_TONE: Record<string, "success" | "info" | "error" | "neutral"> = {
  POST: "success",
  PATCH: "info",
  PUT: "info",
  DELETE: "error",
};

const METHOD_LABELS: Record<string, string> = {
  POST: "ایجاد",
  PATCH: "ویرایش",
  PUT: "جایگزینی",
  DELETE: "حذف",
};

function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity;
}

function MethodBadge({ method }: { method: string }) {
  const tone = METHOD_TONE[method] ?? "neutral";
  return (
    <Box
      component="span"
      sx={
        tone === "neutral"
          ? {
              ...BADGE_BASE,
              color: "text.secondary",
              borderColor: "divider",
            }
          : (theme: Theme) => ({
              ...BADGE_BASE,
              backgroundColor: alpha(theme.palette[tone].main, 0.12),
              borderColor: "transparent",
              // Same light/dark split the P8.S5 delta badge needed: `.main`
              // on its own 12% wash fails contrast in the light palette.
              color: theme.palette[tone].dark,
              ...theme.applyStyles("dark", { color: theme.palette[tone].main }),
            })
      }
    >
      {METHOD_LABELS[method] ?? method}
    </Box>
  );
}

const BADGE_BASE = {
  display: "inline-flex",
  alignItems: "center",
  paddingInline: 1,
  paddingBlock: 0.25,
  borderRadius: 999,
  fontSize: "0.75rem",
  fontWeight: 700,
  lineHeight: 1.6,
  whiteSpace: "nowrap",
  border: 1,
} as const;

function DiffBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <Box sx={{ flex: 1, minWidth: 200 }}>
      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.25,
          borderRadius: 1,
          bgcolor: "action.hover",
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          // The stored payload is arbitrary domain state, so this must
          // scroll inside itself rather than stretch the page.
          overflowX: "auto",
          // JSON is LTR regardless of the surrounding RTL page.
          direction: "ltr",
          textAlign: "start",
        }}
      >
        {JSON.stringify(value, null, 2)}
      </Box>
    </Box>
  );
}

function AuditRow({ entry }: { entry: AdminAuditLogDto }) {
  const [open, setOpen] = useState(false);
  const hasDiff = entry.before !== undefined || entry.after !== undefined;

  return (
    <Box
      component="li"
      sx={{
        position: "relative",
        listStyle: "none",
        // The rail runs along the inline-start edge (the RIGHT edge in
        // RTL), so the whole list reads as one continuous thread rather
        // than a stack of separate cards.
        paddingInlineStart: 3.5,
        pb: 2.5,
        "&:last-of-type": { pb: 0 },
        "&::before": {
          content: '""',
          position: "absolute",
          insetInlineStart: 5,
          insetBlockStart: 14,
          insetBlockEnd: 0,
          inlineSize: "1px",
          bgcolor: "divider",
        },
        "&:last-of-type::before": { display: "none" },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          insetInlineStart: 0,
          insetBlockStart: 8,
          inlineSize: 11,
          blockSize: 11,
          borderRadius: "50%",
          border: 2,
          borderColor: "primary.main",
          bgcolor: "background.paper",
        }}
      />
      <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <MethodBadge method={entry.method} />
        <Chip size="small" variant="outlined" label={entityLabel(entry.entity)} />
        <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
          {formatJalali(entry.createdAt, "D MMMM YYYY — HH:mm")}
        </Typography>
      </Stack>

      <Typography
        sx={{
          mt: 0.75,
          fontFamily: "var(--font-mono)",
          fontSize: "0.8125rem",
          wordBreak: "break-all",
          // A URL path is LTR text inside an RTL page. `direction: ltr`
          // alone gets the character order right but then anchors the line
          // to the box's left edge -- a full row of empty space away from
          // the badges it belongs to. `textAlign: end` under LTR puts it
          // back against the RTL page's own reading edge.
          direction: "ltr",
          textAlign: "end",
        }}
      >
        {entry.path}
      </Typography>

      <Stack direction="row" sx={{ mt: 0.5, gap: 1.5, flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: "0.8125rem" }}>
          {entry.actorName ?? "کاربر حذف‌شده"}
          {entry.actorPhone ? ` · ${toPersianDigits(entry.actorPhone)}` : ""}
        </Typography>
        {entry.ip ? (
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
            IP {toPersianDigits(entry.ip)}
          </Typography>
        ) : null}
        {hasDiff ? (
          <Box
            component="button"
            type="button"
            onClick={() => setOpen((previous) => !previous)}
            aria-expanded={open}
            sx={{
              border: 0,
              bgcolor: "transparent",
              p: 0,
              cursor: "pointer",
              font: "inherit",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "primary.main",
              borderRadius: 1,
              "&:focus-visible": { outline: 2, outlineColor: "primary.main", outlineOffset: 2 },
            }}
          >
            {open ? "بستن تغییرات" : "نمایش تغییرات"}
          </Box>
        ) : null}
      </Stack>

      {hasDiff ? (
        <Collapse in={open} unmountOnExit>
          <Stack direction="row" sx={{ mt: 1.5, gap: 1.5, flexWrap: "wrap" }}>
            {entry.before !== undefined ? (
              <DiffBlock label="پیش از تغییر" value={entry.before} />
            ) : null}
            {entry.after !== undefined ? (
              <DiffBlock label="پس از تغییر" value={entry.after} />
            ) : null}
          </Stack>
        </Collapse>
      ) : null}
    </Box>
  );
}

export function AdminAuditListContent() {
  const [entity, setEntity] = useState("");
  const [method, setMethod] = useState<AuditMethodDto | "">("");
  const [entityId, setEntityId] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminAuditPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void fetchAdminAuditLogs(page, PAGE_SIZE, {
        entity: entity || undefined,
        method: method || undefined,
        entityId: entityId.trim() || undefined,
      }).then((data) => {
        if (cancelled) return;
        setResult(data);
        setFailed(data === null);
        setLoading(false);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, entity, method, entityId]);

  function resetTo(update: () => void): void {
    setLoading(true);
    setPage(1);
    update();
  }

  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <Stack spacing={2.5}>
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
            گزارش رویدادها
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: "0.875rem", color: "text.secondary" }}>
            هر تغییری که کارکنان روی داده‌های فروشگاه انجام داده‌اند
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
          <Select
            size="small"
            displayEmpty
            value={entity}
            inputProps={{ "aria-label": "فیلتر بخش" }}
            onChange={(event) => resetTo(() => setEntity(event.target.value))}
            sx={{ minWidth: 150, bgcolor: "background.paper" }}
          >
            <MenuItem value="">همه بخش‌ها</MenuItem>
            {AUDIT_ENTITIES.map((value) => (
              <MenuItem key={value} value={value}>
                {entityLabel(value)}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            displayEmpty
            value={method}
            inputProps={{ "aria-label": "فیلتر نوع تغییر" }}
            onChange={(event) =>
              resetTo(() => setMethod(event.target.value as AuditMethodDto | ""))
            }
            sx={{ minWidth: 150, bgcolor: "background.paper" }}
          >
            <MenuItem value="">همه تغییرها</MenuItem>
            {AUDIT_METHODS.map((value) => (
              <MenuItem key={value} value={value}>
                {METHOD_LABELS[value] ?? value}
              </MenuItem>
            ))}
          </Select>
          <TextField
            size="small"
            label="شناسه رکورد"
            value={entityId}
            onChange={(event) => resetTo(() => setEntityId(event.target.value))}
            sx={{ bgcolor: "background.paper" }}
          />
        </Stack>
      </Box>

      {failed ? (
        <Alert severity="error">
          خواندن گزارش رویدادها ممکن نشد. این بخش فقط برای نقش مدیر و مدیر ارشد باز است.
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{ border: 1, borderColor: "divider", p: { xs: 2, md: 3 } }}>
        {loading ? (
          <Stack spacing={2}>
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} variant="rounded" height={64} />
            ))}
          </Stack>
        ) : result && result.data.length > 0 ? (
          <Box component="ul" sx={{ m: 0, p: 0 }}>
            {result.data.map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </Box>
        ) : (
          <Typography sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
            {failed ? "—" : "رویدادی با این فیلترها ثبت نشده است"}
          </Typography>
        )}
      </Paper>

      {result && result.total > result.limit ? (
        <Stack sx={{ alignItems: "center" }}>
          <Pagination
            count={pageCount}
            page={page}
            color="primary"
            onChange={(_event, next) => {
              setLoading(true);
              setPage(next);
            }}
          />
        </Stack>
      ) : null}
    </Stack>
  );
}
