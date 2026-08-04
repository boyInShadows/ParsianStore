"use client"; // Loads the attribute dictionary and edits a dynamic pair list.

import { useEffect, useState } from "react";
import { Button, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { AdminAttributeDto } from "schemas";
import { fetchAdminAttributes } from "@/lib/fetchers/admin-catalog";

export type AttributePair = { key: string; value: string };

type Props = {
  value: AttributePair[];
  onChange: (next: AttributePair[]) => void;
};

/**
 * P8.S4. The half that makes the attribute dictionary mean anything.
 *
 * `Product.attributes[]` existed on the model since P3.S2 and the PLP facet
 * buckets + PDP specs table have read it since P5.S1/P5.S2 — but nothing in
 * the product admin form (P8.S2, essential fields only) or the seed script
 * ever wrote it, so across 322 seeded products the array was empty in every
 * single one and both features rendered nothing. This field closes that loop.
 *
 * Values are constrained by the attribute's own declared type; the API
 * re-validates every pair against the dictionary regardless, since a form is
 * not a trust boundary.
 */
export function AdminProductAttributesField({ value, onChange }: Props) {
  const [dictionary, setDictionary] = useState<AdminAttributeDto[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetchAdminAttributes(1, 100, {}).then((page) => {
      setDictionary(page?.data ?? []);
      setLoaded(true);
    });
  }, []);

  const used = new Set(value.map((pair) => pair.key));
  const available = dictionary.filter((attribute) => !used.has(attribute.key));

  function update(index: number, next: Partial<AttributePair>): void {
    onChange(value.map((pair, i) => (i === index ? { ...pair, ...next } : pair)));
  }

  function renderValueField(pair: AttributePair, index: number) {
    const attribute = dictionary.find((entry) => entry.key === pair.key);
    if (attribute?.type === "select") {
      return (
        <TextField
          select
          size="small"
          label="مقدار"
          value={pair.value}
          onChange={(event) => update(index, { value: event.target.value })}
          sx={{ flex: 1 }}
        >
          {attribute.options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      );
    }
    if (attribute?.type === "bool") {
      return (
        <TextField
          select
          size="small"
          label="مقدار"
          value={pair.value}
          onChange={(event) => update(index, { value: event.target.value })}
          sx={{ flex: 1 }}
        >
          <MenuItem value="true">بله</MenuItem>
          <MenuItem value="false">خیر</MenuItem>
        </TextField>
      );
    }
    return (
      <TextField
        size="small"
        label={attribute?.unit ? `مقدار (${attribute.unit})` : "مقدار"}
        type={attribute?.type === "number" ? "number" : "text"}
        value={pair.value}
        onChange={(event) => update(index, { value: event.target.value })}
        sx={{ flex: 1 }}
      />
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
        ویژگی‌ها
      </Typography>

      {loaded && dictionary.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          هنوز ویژگی‌ای تعریف نشده است. ابتدا از بخش کاتالوگ ویژگی بسازید تا بتوانید اینجا مقداردهی
          کنید.
        </Typography>
      )}

      {value.map((pair, index) => {
        const attribute = dictionary.find((entry) => entry.key === pair.key);
        return (
          <Stack key={pair.key} direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <TextField
              size="small"
              label="ویژگی"
              value={attribute?.name ?? pair.key}
              slotProps={{ input: { readOnly: true } }}
              sx={{ flex: 1 }}
            />
            {renderValueField(pair, index)}
            <IconButton
              aria-label={`حذف ویژگی ${attribute?.name ?? pair.key}`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              ×
            </IconButton>
          </Stack>
        );
      })}

      {available.length > 0 && (
        <TextField
          select
          size="small"
          label="افزودن ویژگی"
          value=""
          onChange={(event) => onChange([...value, { key: event.target.value, value: "" }])}
          sx={{ maxWidth: 280 }}
        >
          {available.map((attribute) => (
            <MenuItem key={attribute.key} value={attribute.key}>
              {attribute.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {loaded && dictionary.length > 0 && available.length === 0 && value.length > 0 && (
        <Button size="small" disabled>
          همه ویژگی‌های تعریف‌شده استفاده شده‌اند
        </Button>
      )}
    </Stack>
  );
}
