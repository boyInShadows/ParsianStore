"use client"; // Create/edit dialog, delete confirmation and a state
// toggle -- all interactive, same as the other admin config screens.

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  SHIPPING_METHODS,
  formatToman,
  toPersianDigits,
  type AdminShippingRateDto,
  type ShippingZone,
} from "schemas";
import {
  deleteAdminShippingRate,
  fetchAdminShippingRates,
  restoreAdminShippingRate,
  type AdminShippingRatePage,
} from "@/lib/fetchers/admin-shipping";
import { useToastStore } from "@/stores/toast-store";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminShippingRateFormDialog } from "./AdminShippingRateFormDialog";

// The whole ladder is a config table of a few dozen rows at most, so one
// page covers it -- the API is still paginated (§9), this just asks for
// the maximum the endpoint allows rather than paging a settings screen.
const PAGE_SIZE = 100;

const ZONE_LABELS: Record<string, string> = { tehran: "تهران", other: "سایر استان‌ها" };

function gram(value: number): string {
  return toPersianDigits(value.toLocaleString("en-US").replace(/,/g, "٬"));
}

/**
 * What estimateShipping would actually do with this ladder, said out
 * loud. A gap or a missing open-ended top bracket does not fail loudly
 * anywhere -- it just makes the courier quietly disappear from checkout
 * for carts of that weight, which is exactly the kind of thing a config
 * screen should surface rather than leave to be discovered by a customer.
 */
function ladderWarnings(rates: AdminShippingRateDto[]): string[] {
  if (rates.length === 0) return [];
  const sorted = [...rates].sort((a, b) => a.minWeightGram - b.minWeightGram);
  const warnings: string[] = [];

  if (sorted[0] && sorted[0].minWeightGram > 0) {
    warnings.push(`سبدهای سبک‌تر از ${gram(sorted[0].minWeightGram)} گرم نرخی ندارند.`);
  }

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    if (!current || !next || current.maxWeightGram === null) continue;
    if (next.minWeightGram > current.maxWeightGram + 1) {
      warnings.push(
        `بین ${gram(current.maxWeightGram + 1)} تا ${gram(next.minWeightGram - 1)} گرم نرخی تعریف نشده است.`,
      );
    }
  }

  const last = sorted.at(-1);
  if (last && last.maxWeightGram !== null) {
    warnings.push(`سبدهای سنگین‌تر از ${gram(last.maxWeightGram)} گرم نرخی ندارند.`);
  }
  return warnings;
}

function LadderCard({
  title,
  zone,
  rates,
  isDeletedView,
  onEdit,
  onDelete,
  onRestore,
}: {
  title: string;
  zone: ShippingZone;
  rates: AdminShippingRateDto[];
  isDeletedView: boolean;
  onEdit: (rate: AdminShippingRateDto) => void;
  onDelete: (rate: AdminShippingRateDto) => void;
  onRestore: (rate: AdminShippingRateDto) => void;
}) {
  const sorted = [...rates].sort((a, b) => a.minWeightGram - b.minWeightGram);
  const warnings = isDeletedView ? [] : ladderWarnings(sorted);

  return (
    <Paper elevation={0} sx={{ border: 1, borderColor: "divider", overflow: "hidden" }}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: 1,
          px: 2.5,
          py: 1.75,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography component="h2" sx={{ fontSize: "0.9375rem", fontWeight: 700 }}>
          {title}
        </Typography>
        <Chip
          size="small"
          label={ZONE_LABELS[zone] ?? zone}
          color={zone === "tehran" ? "primary" : "default"}
          variant={zone === "tehran" ? "filled" : "outlined"}
        />
      </Stack>

      {sorted.length === 0 ? (
        <Typography sx={{ p: 2.5, fontSize: "0.875rem", color: "text.secondary" }}>
          نرخی تعریف نشده — این روش در تسویه‌حساب نمایش داده نمی‌شود.
        </Typography>
      ) : (
        <Stack sx={{ p: 1 }}>
          {sorted.map((rate) => (
            <Stack
              key={rate.id}
              direction="row"
              sx={{
                alignItems: "center",
                gap: 1.5,
                px: 1.5,
                py: 1.25,
                borderRadius: 1,
                transition: "background-color 160ms ease",
                "&:hover": { bgcolor: "action.hover" },
                "@media (prefers-reduced-motion: reduce)": { transition: "none" },
              }}
            >
              <Typography
                sx={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", minWidth: 150 }}
              >
                {gram(rate.minWeightGram)} –{" "}
                {rate.maxWeightGram === null ? "∞" : gram(rate.maxWeightGram)} گرم
              </Typography>
              <Typography sx={{ flex: 1, fontWeight: 700, fontSize: "0.9375rem" }}>
                {formatToman(rate.priceRial)}
              </Typography>
              {isDeletedView ? (
                <Button size="small" onClick={() => onRestore(rate)}>
                  بازگردانی
                </Button>
              ) : (
                <Stack direction="row" spacing={0.5}>
                  <Button size="small" onClick={() => onEdit(rate)}>
                    ویرایش
                  </Button>
                  <Button size="small" color="error" onClick={() => onDelete(rate)}>
                    حذف
                  </Button>
                </Stack>
              )}
            </Stack>
          ))}
        </Stack>
      )}

      {warnings.length > 0 ? (
        <Box sx={{ px: 2, pb: 2 }}>
          <Alert severity="warning" sx={{ fontSize: "0.8125rem" }}>
            <Stack component="ul" sx={{ m: 0, paddingInlineStart: 2 }}>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </Stack>
          </Alert>
        </Box>
      ) : null}
    </Paper>
  );
}

export function AdminShippingRatesContent() {
  const showToast = useToastStore((state) => state.show);
  const [state, setState] = useState<"active" | "deleted">("active");
  const [result, setResult] = useState<AdminShippingRatePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<AdminShippingRateDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminShippingRateDto | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminShippingRates(1, PAGE_SIZE, { state }).then((data) => {
      if (cancelled) return;
      setResult(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [state, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  async function handleDelete(): Promise<void> {
    if (!pendingDelete) return;
    setBusy(true);
    const response = await deleteAdminShippingRate(pendingDelete.id);
    setBusy(false);
    setPendingDelete(null);
    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast("نرخ ارسال حذف شد", "success");
    reload();
  }

  async function handleRestore(rate: AdminShippingRateDto): Promise<void> {
    const response = await restoreAdminShippingRate(rate.id);
    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast("نرخ ارسال بازگردانده شد", "success");
    reload();
  }

  // One card per courier+zone the courier actually serves, in the order
  // SHIPPING_METHODS declares -- so a combination with NO rates still gets
  // a card saying so, instead of silently not existing on this screen.
  const groups = SHIPPING_METHODS.flatMap((method) =>
    method.zones.map((zone) => ({
      key: `${method.code}-${zone}`,
      title: method.name.fa,
      zone: zone as ShippingZone,
      rates: (result?.data ?? []).filter(
        (rate) => rate.methodCode === method.code && rate.zone === zone,
      ),
    })),
  );

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
            نرخ‌های ارسال
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: "0.875rem", color: "text.secondary" }}>
            پله‌های وزن و قیمت هر روش ارسال، به تفکیک منطقه
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
          <Select
            size="small"
            value={state}
            inputProps={{ "aria-label": "وضعیت" }}
            onChange={(event) => {
              setLoading(true);
              setState(event.target.value as "active" | "deleted");
            }}
            sx={{ bgcolor: "background.paper" }}
          >
            <MenuItem value="active">فعال</MenuItem>
            <MenuItem value="deleted">حذف‌شده</MenuItem>
          </Select>
          <Button variant="contained" onClick={() => setCreating(true)}>
            نرخ جدید
          </Button>
        </Stack>
      </Box>

      {/* Said once at the top rather than repeated on every card: the
          courier list itself is fixed in code, which is a real constraint
          staff would otherwise go looking for a button to change. */}
      <Alert severity="info">
        فهرست روش‌های ارسال ثابت است؛ آنچه اینجا تنظیم می‌شود پله‌های وزن و قیمت هر روش است.
      </Alert>

      {loading ? (
        <Stack spacing={2}>
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} variant="rounded" height={160} />
          ))}
        </Stack>
      ) : (
        <Stack spacing={2}>
          {groups.map((group) => (
            <LadderCard
              key={group.key}
              title={group.title}
              zone={group.zone}
              rates={group.rates}
              isDeletedView={state === "deleted"}
              onEdit={setEditing}
              onDelete={setPendingDelete}
              onRestore={(rate) => void handleRestore(rate)}
            />
          ))}
        </Stack>
      )}

      {(creating || editing !== null) && (
        <AdminShippingRateFormDialog
          rate={editing}
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
        title="حذف نرخ ارسال"
        description="این پله وزنی حذف شود؟ اگر سبدی در این بازه وزن باشد، این روش ارسال دیگر به مشتری پیشنهاد نمی‌شود."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </Stack>
  );
}
