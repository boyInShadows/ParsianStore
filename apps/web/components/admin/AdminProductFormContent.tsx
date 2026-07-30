"use client"; // form state, fetches brand/category options, calls the admin fetchers

import { useEffect, useState, type FormEvent } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import { SUPPLY_ROUTES, type AdminProductDetailDto, type SupplyRouteDto } from "schemas";
import { useRouter } from "@/i18n/navigation";
import {
  createAdminProduct,
  fetchAllBrands,
  fetchAllCategories,
  updateAdminProduct,
} from "@/lib/fetchers/admin-products";
import { useToastStore } from "@/stores/toast-store";

const SUPPLY_ROUTE_LABEL: Record<SupplyRouteDto, string> = {
  oem: "OEM",
  "genuine-imported": "اصلی وارداتی",
  domestic: "تولید داخل",
  "grade1-aftermarket": "درجه ۱ بازار",
};

type Props = { mode: "create" } | { mode: "edit"; product: AdminProductDetailDto };

interface FormState {
  nameFa: string;
  nameEn: string;
  slug: string;
  sku: string;
  brandId: string;
  categoryId: string;
  priceRial: string;
  wholesalePriceRial: string;
  taxRate: string;
  stock: string;
  weightGram: string;
  supplyRoute: SupplyRouteDto;
  sourceBrand: string;
  countryOfManufacture: string;
  verificationCode: string;
}

function initialState(product?: AdminProductDetailDto): FormState {
  if (!product) {
    return {
      nameFa: "",
      nameEn: "",
      slug: "",
      sku: "",
      brandId: "",
      categoryId: "",
      priceRial: "",
      wholesalePriceRial: "",
      taxRate: "9",
      stock: "0",
      weightGram: "",
      supplyRoute: "oem",
      sourceBrand: "",
      countryOfManufacture: "",
      verificationCode: "",
    };
  }
  return {
    nameFa: product.name.fa,
    nameEn: product.name.en,
    slug: product.slug,
    sku: product.sku,
    brandId: product.brandId,
    categoryId: product.categoryId,
    priceRial: String(product.priceRial),
    wholesalePriceRial: product.wholesalePriceRial ? String(product.wholesalePriceRial) : "",
    taxRate: String(product.taxRate),
    stock: String(product.stock),
    weightGram: String(product.weightGram),
    supplyRoute: product.authenticity.supplyRoute,
    sourceBrand: product.authenticity.sourceBrand,
    countryOfManufacture: product.authenticity.countryOfManufacture,
    verificationCode: product.authenticity.verificationCode,
  };
}

export function AdminProductFormContent(props: Props) {
  const router = useRouter();
  const showToast = useToastStore((state) => state.show);
  const [form, setForm] = useState<FormState>(
    initialState(props.mode === "edit" ? props.product : undefined),
  );
  const [brands, setBrands] = useState<{ id: string; name: { fa: string } }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: { fa: string } }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchAllBrands().then(setBrands);
    void fetchAllCategories().then(setCategories);
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    const input = {
      name: { fa: form.nameFa, en: form.nameEn },
      slug: form.slug,
      sku: form.sku,
      brandId: form.brandId,
      categoryId: form.categoryId,
      priceRial: Number(form.priceRial),
      wholesalePriceRial: form.wholesalePriceRial ? Number(form.wholesalePriceRial) : undefined,
      taxRate: Number(form.taxRate),
      stock: Number(form.stock),
      weightGram: Number(form.weightGram),
      authenticity: {
        supplyRoute: form.supplyRoute,
        sourceBrand: form.sourceBrand,
        countryOfManufacture: form.countryOfManufacture,
        verificationCode: form.verificationCode,
      },
    };

    const result =
      props.mode === "edit"
        ? await updateAdminProduct(props.product.id, input)
        : await createAdminProduct(input);
    setSaving(false);
    if (!result.ok) {
      showToast(result.message, "danger");
      return;
    }
    showToast(props.mode === "edit" ? "محصول به‌روزرسانی شد" : "محصول ایجاد شد", "success");
    router.push(`/admin/products/${result.data.id}`);
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 3 }}>
          {props.mode === "edit" ? "ویرایش محصول" : "محصول جدید"}
        </Typography>
        <Box
          component="form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => void handleSubmit(event)}
        >
          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="نام فارسی"
                  value={form.nameFa}
                  onChange={(event) => set("nameFa", event.target.value)}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="نام انگلیسی"
                  value={form.nameEn}
                  onChange={(event) => set("nameEn", event.target.value)}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="نامک (slug)"
                  value={form.slug}
                  onChange={(event) => set("slug", event.target.value)}
                  required
                  fullWidth
                  helperText="فقط حروف انگلیسی کوچک، عدد و خط تیره"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="کد کالا (SKU)"
                  value={form.sku}
                  onChange={(event) => set("sku", event.target.value)}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Select
                  value={form.brandId}
                  onChange={(event: SelectChangeEvent) => set("brandId", event.target.value)}
                  displayEmpty
                  required
                  fullWidth
                  inputProps={{ "aria-label": "برند" }}
                >
                  <MenuItem value="" disabled>
                    برند
                  </MenuItem>
                  {brands.map((brand) => (
                    <MenuItem key={brand.id} value={brand.id}>
                      {brand.name.fa}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Select
                  value={form.categoryId}
                  onChange={(event: SelectChangeEvent) => set("categoryId", event.target.value)}
                  displayEmpty
                  required
                  fullWidth
                  inputProps={{ "aria-label": "دسته‌بندی" }}
                >
                  <MenuItem value="" disabled>
                    دسته‌بندی
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name.fa}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="قیمت (ریال)"
                  type="number"
                  value={form.priceRial}
                  onChange={(event) => set("priceRial", event.target.value)}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="قیمت عمده (ریال، اختیاری)"
                  type="number"
                  value={form.wholesalePriceRial}
                  onChange={(event) => set("wholesalePriceRial", event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="نرخ مالیات (٪)"
                  type="number"
                  value={form.taxRate}
                  onChange={(event) => set("taxRate", event.target.value)}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="موجودی"
                  type="number"
                  value={form.stock}
                  onChange={(event) => set("stock", event.target.value)}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="وزن (گرم)"
                  type="number"
                  value={form.weightGram}
                  onChange={(event) => set("weightGram", event.target.value)}
                  required
                  fullWidth
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
              اصالت کالا
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Select
                  value={form.supplyRoute}
                  onChange={(event: SelectChangeEvent) =>
                    set("supplyRoute", event.target.value as SupplyRouteDto)
                  }
                  fullWidth
                  inputProps={{ "aria-label": "مسیر تأمین" }}
                >
                  {SUPPLY_ROUTES.map((route) => (
                    <MenuItem key={route} value={route}>
                      {SUPPLY_ROUTE_LABEL[route]}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="برند منبع"
                  value={form.sourceBrand}
                  onChange={(event) => set("sourceBrand", event.target.value)}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="کشور سازنده"
                  value={form.countryOfManufacture}
                  onChange={(event) => set("countryOfManufacture", event.target.value)}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="کد راستی‌آزمایی"
                  value={form.verificationCode}
                  onChange={(event) => set("verificationCode", event.target.value)}
                  required
                  fullWidth
                />
              </Grid>
            </Grid>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? "در حال ذخیره…" : "ذخیره محصول"}
              </Button>
              <Button variant="text" onClick={() => router.push("/admin/products")}>
                انصراف
              </Button>
            </Box>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
