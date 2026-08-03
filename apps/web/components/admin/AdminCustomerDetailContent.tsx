"use client"; // Client-side load of the detail payload plus an inline
// account-type control -- both interactive, same as the customers list.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Box,
  Chip,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  formatJalali,
  formatToman,
  toPersianDigits,
  type AccountTypeDto,
  type AdminCustomerDetailDto,
} from "schemas";
import { Link } from "@/i18n/navigation";
import {
  fetchAdminCustomerDetail,
  setAdminCustomerAccountType,
} from "@/lib/fetchers/admin-customers";
import { useToastStore } from "@/stores/toast-store";
import { AdminPanel, RecentOrdersPanel } from "./AdminDashboardPanels";
import { AdminStatTile } from "./AdminStatTile";

const GRID_SX = {
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  gap: 2,
} as const;

function span(desktop: number, tablet = 6) {
  return { gridColumn: { xs: "span 12", md: `span ${tablet}`, lg: `span ${desktop}` } };
}

/** Label / value pair -- the identity block's only repeated shape. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", letterSpacing: "0.03em" }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600 }}>{value}</Typography>
    </Box>
  );
}

export function AdminCustomerDetailContent({ customerId }: { customerId: string }) {
  const tStatus = useTranslations("Orders.status");
  const showToast = useToastStore((state) => state.show);
  const [customer, setCustomer] = useState<AdminCustomerDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminCustomerDetail(customerId).then((data) => {
      if (cancelled) return;
      setCustomer(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  function statusLabel(status: string): string {
    return tStatus.has(status) ? tStatus(status) : status;
  }

  async function handleAccountTypeChange(next: AccountTypeDto): Promise<void> {
    if (!customer) return;
    setSaving(true);
    const response = await setAdminCustomerAccountType(customer.id, next);
    setSaving(false);
    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    // Patch the one field rather than refetching the whole detail payload
    // (orders, addresses and garage are unchanged by this write).
    setCustomer({ ...customer, accountType: next });
    showToast(next === "wholesale" ? "حساب عمده‌فروشی شد" : "حساب خرده‌فروشی شد", "success");
  }

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="text" width={220} height={40} />
        <Skeleton variant="rounded" height={140} />
        <Skeleton variant="rounded" height={280} />
      </Stack>
    );
  }

  if (!customer) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">این مشتری یافت نشد یا خواندن اطلاعات ممکن نشد.</Alert>
        <Typography component={Link} href="/admin/customers" sx={{ color: "primary.main" }}>
          بازگشت به فهرست مشتریان
        </Typography>
      </Stack>
    );
  }

  const isWholesale = customer.accountType === "wholesale";
  // `name` is optional on the shared customer DTO (the list tolerates a
  // blank), so the detail page needs its own fallback rather than
  // rendering an empty <h1>.
  const displayName = customer.name ?? "بدون نام";

  return (
    <Stack spacing={3}>
      <Box>
        <Typography
          component={Link}
          href="/admin/customers"
          sx={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "text.secondary",
            textDecoration: "none",
            "&:hover": { color: "primary.main" },
            "&:focus-visible": { outline: 2, outlineColor: "primary.main", outlineOffset: 2 },
          }}
        >
          ← مشتریان
        </Typography>
        <Stack
          direction="row"
          sx={{
            mt: 1,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
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
              {displayName}
            </Typography>
            <Stack direction="row" sx={{ mt: 0.75, alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontFamily: "var(--font-mono)", color: "text.secondary" }}>
                {toPersianDigits(customer.phone)}
              </Typography>
              {isWholesale ? <Chip size="small" color="primary" label="عمده‌فروش" /> : null}
              {!customer.isActive ? (
                <Chip size="small" color="error" label="غیرفعال" variant="outlined" />
              ) : null}
            </Stack>
          </Box>
          <Select
            size="small"
            value={customer.accountType}
            disabled={saving}
            inputProps={{ "aria-label": "نوع حساب مشتری" }}
            onChange={(event) => void handleAccountTypeChange(event.target.value as AccountTypeDto)}
            sx={{ minWidth: 190, bgcolor: "background.paper" }}
          >
            <MenuItem value="retail">خرده‌فروشی</MenuItem>
            <MenuItem value="wholesale">عمده‌فروشی</MenuItem>
          </Select>
        </Stack>
      </Box>

      <Alert severity="info">
        تغییر نوع حساب پس از تازه‌سازی نشست کاربر روی قیمت‌هایی که می‌بیند اعمال می‌شود، نه
        بلافاصله.
      </Alert>

      <Box sx={GRID_SX}>
        <Box sx={span(6)}>
          <AdminStatTile
            emphasis="hero"
            label="ارزش کل خرید"
            value={formatToman(customer.stats.lifetimeValueRial)}
            caption={
              customer.stats.lastOrderAt
                ? `آخرین خرید ${formatJalali(customer.stats.lastOrderAt, "D MMMM YYYY")}`
                : "هنوز خریدی ثبت نشده است"
            }
          />
        </Box>
        <Box sx={span(3)}>
          <AdminStatTile label="سفارش موفق" value={toPersianDigits(customer.stats.orderCount)} />
        </Box>
        <Box sx={span(3)}>
          <AdminStatTile label="میانگین سبد" value={formatToman(customer.stats.averageOrderRial)} />
        </Box>
        <Box sx={span(3)}>
          <AdminStatTile
            label="سفارش باز"
            value={toPersianDigits(customer.stats.openOrderCount)}
            caption="در انتظار پرداخت یا آماده‌سازی"
          />
        </Box>
        <Box sx={span(3)}>
          <AdminStatTile label="موجودی کیف پول" value={formatToman(customer.walletBalanceRial)} />
        </Box>
      </Box>

      <Box sx={GRID_SX}>
        <Box sx={span(4, 12)}>
          <AdminPanel title="شناسه مشتری">
            <Stack spacing={1.75} sx={{ p: 1.5 }}>
              <Field label="نام" value={displayName} />
              <Field label="شماره موبایل" value={toPersianDigits(customer.phone)} />
              <Field label="ایمیل" value={customer.email ?? "ثبت نشده"} />
              <Field label="تاریخ عضویت" value={formatJalali(customer.createdAt, "D MMMM YYYY")} />
              <Field
                label="آخرین ورود"
                value={
                  customer.lastLoginAt
                    ? formatJalali(customer.lastLoginAt, "D MMMM YYYY")
                    : "بدون ورود ثبت‌شده"
                }
              />
            </Stack>
          </AdminPanel>
        </Box>

        <Box sx={span(8, 12)}>
          <AdminPanel title="نشانی‌ها">
            {customer.addresses.length === 0 ? (
              <Typography sx={{ p: 2.5, fontSize: "0.875rem", color: "text.secondary" }}>
                این مشتری هنوز نشانی ثبت نکرده است
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ p: 1 }}>
                {customer.addresses.map((address) => (
                  <Paper
                    key={address.id}
                    elevation={0}
                    sx={{
                      p: 1.75,
                      border: 1,
                      borderColor: "divider",
                      borderInlineStartWidth: 3,
                      borderInlineStartColor: "primary.main",
                    }}
                  >
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>
                      {address.province} / {address.city}
                    </Typography>
                    <Typography sx={{ mt: 0.5, fontSize: "0.875rem" }}>
                      {address.line}
                      {address.plate ? `، پلاک ${toPersianDigits(address.plate)}` : ""}
                      {address.unit ? `، واحد ${toPersianDigits(address.unit)}` : ""}
                    </Typography>
                    <Typography sx={{ mt: 0.5, fontSize: "0.8125rem", color: "text.secondary" }}>
                      کد پستی {toPersianDigits(address.postalCode)} — گیرنده {address.receiverName}{" "}
                      ({toPersianDigits(address.receiverPhone)})
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </AdminPanel>
        </Box>

        <Box sx={span(4, 12)}>
          <AdminPanel title="گاراژ">
            {customer.garage.length === 0 ? (
              <Typography sx={{ p: 2.5, fontSize: "0.875rem", color: "text.secondary" }}>
                خودرویی در گاراژ ثبت نشده است
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ p: 1 }}>
                {customer.garage.map((vehicle) => (
                  <Box key={vehicle.id} sx={{ px: 1.5, py: 1.25 }}>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>
                      {vehicle.make} {vehicle.model}
                      {vehicle.nickname ? ` — ${vehicle.nickname}` : ""}
                    </Typography>
                    <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
                      {vehicle.generation} · مدل {toPersianDigits(vehicle.year)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </AdminPanel>
        </Box>

        <Box sx={span(8, 12)}>
          <AdminPanel
            title="سفارش‌های اخیر"
            action={{ href: "/admin/orders", label: "همه سفارش‌ها" }}
          >
            <RecentOrdersPanel rows={customer.recentOrders} statusLabel={statusLabel} />
          </AdminPanel>
        </Box>
      </Box>
    </Stack>
  );
}
