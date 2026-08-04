"use client"; // fetches + mutates order status client-side, form state

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import {
  formatJalali,
  formatToman,
  orderStatusSchema,
  type AdminOrderDetailDto,
  type OrderStatusDto,
} from "schemas";
import { fetchAdminOrder, updateAdminOrderStatus } from "@/lib/fetchers/admin-orders";
import { useToastStore } from "@/stores/toast-store";

const STATUS_TONE: Record<OrderStatusDto, "default" | "info" | "success" | "error"> = {
  pending: "default",
  paid: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "error",
  refunded: "error",
};

type Props = { id: string };

export function AdminOrderDetailContent({ id }: Props) {
  const t = useTranslations("Orders.status");
  const tDetail = useTranslations("Orders.detail");
  const showToast = useToastStore((state) => state.show);
  const [order, setOrder] = useState<AdminOrderDetailDto | null | undefined>(undefined);
  const [nextStatus, setNextStatus] = useState<OrderStatusDto>("pending");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchAdminOrder(id).then((data) => {
      setOrder(data);
      if (data) setNextStatus(data.status);
    });
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    const result = await updateAdminOrderStatus(id, nextStatus, note.trim() || undefined);
    setSaving(false);
    if (!result.ok) {
      showToast(result.message, "danger");
      return;
    }
    setOrder(result.data);
    setNote("");
    showToast("وضعیت سفارش به‌روزرسانی شد", "success");
  }

  if (order === undefined) {
    return <Typography color="text.secondary">در حال بارگذاری…</Typography>;
  }
  if (order === null) {
    return <Typography color="error">سفارش یافت نشد</Typography>;
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
            {tDetail("title", { code: order.code })}
          </Typography>
          <Typography color="text.secondary">{order.customerPhone}</Typography>
        </Box>
        <Chip label={t(order.status)} color={STATUS_TONE[order.status]} />
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
            {tDetail("itemsTitle")}
          </Typography>
          <Stack spacing={1}>
            {order.items.map((item, index) => (
              <Box key={index} sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography>{item.nameSnapshot.fa}</Typography>
                <Typography color="text.secondary">
                  {tDetail("qtyAtPrice", { qty: item.qty, price: formatToman(item.priceRial) })}
                </Typography>
              </Box>
            ))}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={0.5}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography color="text.secondary">{tDetail("subtotalLabel")}</Typography>
              <Typography>{formatToman(order.subtotalRial)}</Typography>
            </Box>
            {order.discountRial > 0 ? (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="text.secondary">{tDetail("discountLabel")}</Typography>
                <Typography>-{formatToman(order.discountRial)}</Typography>
              </Box>
            ) : null}
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography color="text.secondary">{tDetail("shippingLabel")}</Typography>
              <Typography>{formatToman(order.shippingRial)}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography sx={{ fontWeight: 700 }}>{tDetail("totalLabel")}</Typography>
              <Typography sx={{ fontWeight: 700 }}>{formatToman(order.totalRial)}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
            {tDetail("addressTitle")}
          </Typography>
          <Typography>{order.address.receiverName}</Typography>
          <Typography color="text.secondary">{order.address.receiverPhone}</Typography>
          <Typography color="text.secondary">
            {order.address.province.fa}، {order.address.city.fa}، {order.address.line}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
            {tDetail("shippingMethodTitle")}
          </Typography>
          <Typography>{order.shippingMethod.name.fa}</Typography>
          {order.trackingCode ? (
            <Typography color="text.secondary">
              {tDetail("trackingCode", { code: order.trackingCode })}
            </Typography>
          ) : null}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
            {tDetail("timelineTitle")}
          </Typography>
          <Stack spacing={1}>
            {order.statusHistory.map((entry, index) => (
              <Box key={index} sx={{ display: "flex", gap: 2 }}>
                <Typography sx={{ minWidth: 100 }}>{t(entry.status)}</Typography>
                <Typography color="text.secondary">
                  {formatJalali(entry.at, "YYYY/MM/DD HH:mm")}
                </Typography>
                {entry.note ? <Typography color="text.secondary">— {entry.note}</Typography> : null}
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 2 }}>
            تغییر وضعیت سفارش
          </Typography>
          <Box
            component="form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => void handleSubmit(event)}
            sx={{ display: "flex", gap: 2, alignItems: "flex-start", flexWrap: "wrap" }}
          >
            <Select
              size="small"
              value={nextStatus}
              onChange={(event: SelectChangeEvent) =>
                setNextStatus(event.target.value as OrderStatusDto)
              }
              inputProps={{ "aria-label": "وضعیت جدید سفارش" }}
              sx={{ minWidth: 180 }}
            >
              {orderStatusSchema.options.map((value) => (
                <MenuItem key={value} value={value}>
                  {t(value)}
                </MenuItem>
              ))}
            </Select>
            <TextField
              size="small"
              label="یادداشت (اختیاری)"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              sx={{ flex: 1, minWidth: 240 }}
            />
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "در حال ذخیره…" : "ثبت تغییر وضعیت"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
