"use client"; // Controlled form fields, validation state, submit handler.

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import {
  BODY_TYPES,
  FUEL_TYPES,
  adminCreateVehicleEngineInputSchema,
  adminCreateVehicleGenInputSchema,
  adminCreateVehicleMakeInputSchema,
  adminCreateVehicleModelInputSchema,
  toEnglishDigits,
  type AdminVehicleEngineDto,
  type AdminVehicleGenDto,
  type AdminVehicleMakeDto,
  type AdminVehicleModelDto,
} from "schemas";
import {
  createAdminEngine,
  createAdminGeneration,
  createAdminMake,
  createAdminModel,
  updateAdminEngine,
  updateAdminGeneration,
  updateAdminMake,
  updateAdminModel,
} from "@/lib/fetchers/admin-vehicles";
import { useToastStore } from "@/stores/toast-store";

export type VehicleEntityKind = "make" | "model" | "generation" | "engine";

export type VehicleEntity =
  AdminVehicleMakeDto | AdminVehicleModelDto | AdminVehicleGenDto | AdminVehicleEngineDto;

// No `open` prop -- see AdminCategoryFormDialog for the reasoning.
type Props = {
  kind: VehicleEntityKind;
  entity: VehicleEntity | null;
  /** The id of the row selected in the column to the right of this one. */
  parentId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

const TITLES: Record<VehicleEntityKind, { create: string; edit: string }> = {
  make: { create: "برند خودروی جدید", edit: "ویرایش برند خودرو" },
  model: { create: "مدل جدید", edit: "ویرایش مدل" },
  generation: { create: "نسل جدید", edit: "ویرایش نسل" },
  engine: { create: "موتور جدید", edit: "ویرایش موتور" },
};

export const BODY_TYPE_LABELS: Record<string, string> = {
  sedan: "سدان",
  hatchback: "هاچ‌بک",
  liftback: "لیفت‌بک",
  pickup: "وانت",
  crossover: "کراس‌اوور",
};

export const FUEL_LABELS: Record<string, string> = { petrol: "بنزینی", cng: "دوگانه‌سوز (CNG)" };

const EMPTY = {
  nameFa: "",
  nameEn: "",
  slug: "",
  country: "",
  isDomestic: false,
  bodyType: "sedan",
  yearFrom: "",
  yearTo: "",
  isCurrent: false,
  facelift: false,
  code: "",
  displacement: "",
  fuel: "petrol",
  power: "",
};

type FormState = typeof EMPTY;

function initialState(kind: VehicleEntityKind, entity: VehicleEntity | null): FormState {
  if (!entity) return EMPTY;
  const base = { ...EMPTY };
  if (kind === "make") {
    const make = entity as AdminVehicleMakeDto;
    return {
      ...base,
      nameFa: make.name.fa,
      nameEn: make.name.en,
      slug: make.slug,
      country: make.country,
      isDomestic: make.isDomestic,
    };
  }
  if (kind === "model") {
    const model = entity as AdminVehicleModelDto;
    return {
      ...base,
      nameFa: model.name.fa,
      nameEn: model.name.en,
      slug: model.slug,
      bodyType: model.bodyType,
    };
  }
  if (kind === "generation") {
    const generation = entity as AdminVehicleGenDto;
    return {
      ...base,
      nameFa: generation.name.fa,
      nameEn: generation.name.en,
      yearFrom: String(generation.yearFrom),
      yearTo: generation.yearTo === null ? "" : String(generation.yearTo),
      isCurrent: generation.yearTo === null,
      facelift: generation.facelift,
    };
  }
  const engine = entity as AdminVehicleEngineDto;
  return {
    ...base,
    code: engine.code,
    displacement: String(engine.displacement),
    fuel: engine.fuel,
    power: String(engine.power),
  };
}

/** Every numeric field accepts Persian/Arabic-Indic digits (§7.5). */
function toNumber(input: string): number {
  return Number(toEnglishDigits(input).replace(/[^\d.-]/g, ""));
}

export function AdminVehicleFormDialog({ kind, entity, parentId, onClose, onSaved }: Props) {
  const showToast = useToastStore((state) => state.show);
  const [form, setForm] = useState(() => initialState(kind, entity));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function collectErrors(issues: { path: (string | number)[]; message: string }[]): void {
    const next: Record<string, string> = {};
    for (const issue of issues) {
      next[issue.path.join(".") || "form"] = issue.message;
    }
    setErrors(next);
  }

  async function submitMake(): Promise<{ ok: boolean; message?: string }> {
    const parsed = adminCreateVehicleMakeInputSchema.safeParse({
      name: { fa: form.nameFa.trim(), en: form.nameEn.trim() },
      slug: form.slug.trim(),
      country: form.country.trim(),
      isDomestic: form.isDomestic,
    });
    if (!parsed.success) {
      collectErrors(parsed.error.issues);
      return { ok: false };
    }
    const response = entity
      ? await updateAdminMake(entity.id, parsed.data)
      : await createAdminMake(parsed.data);
    return response.ok ? { ok: true } : { ok: false, message: response.message };
  }

  async function submitModel(): Promise<{ ok: boolean; message?: string }> {
    const parsed = adminCreateVehicleModelInputSchema.safeParse({
      makeId: entity ? (entity as AdminVehicleModelDto).makeId : (parentId ?? ""),
      name: { fa: form.nameFa.trim(), en: form.nameEn.trim() },
      slug: form.slug.trim(),
      bodyType: form.bodyType,
    });
    if (!parsed.success) {
      collectErrors(parsed.error.issues);
      return { ok: false };
    }
    const response = entity
      ? await updateAdminModel(entity.id, parsed.data)
      : await createAdminModel(parsed.data);
    return response.ok ? { ok: true } : { ok: false, message: response.message };
  }

  async function submitGeneration(): Promise<{ ok: boolean; message?: string }> {
    const parsed = adminCreateVehicleGenInputSchema.safeParse({
      modelId: entity ? (entity as AdminVehicleGenDto).modelId : (parentId ?? ""),
      name: { fa: form.nameFa.trim(), en: form.nameEn.trim() },
      yearFrom: toNumber(form.yearFrom),
      yearTo: form.isCurrent ? null : toNumber(form.yearTo),
      facelift: form.facelift,
    });
    if (!parsed.success) {
      collectErrors(parsed.error.issues);
      return { ok: false };
    }
    const response = entity
      ? await updateAdminGeneration(entity.id, parsed.data)
      : await createAdminGeneration(parsed.data);
    return response.ok ? { ok: true } : { ok: false, message: response.message };
  }

  async function submitEngine(): Promise<{ ok: boolean; message?: string }> {
    const parsed = adminCreateVehicleEngineInputSchema.safeParse({
      genId: entity ? (entity as AdminVehicleEngineDto).genId : (parentId ?? ""),
      code: form.code.trim(),
      displacement: toNumber(form.displacement),
      fuel: form.fuel,
      power: toNumber(form.power),
    });
    if (!parsed.success) {
      collectErrors(parsed.error.issues);
      return { ok: false };
    }
    const response = entity
      ? await updateAdminEngine(entity.id, parsed.data)
      : await createAdminEngine(parsed.data);
    return response.ok ? { ok: true } : { ok: false, message: response.message };
  }

  async function handleSubmit(): Promise<void> {
    setErrors({});
    setSaving(true);
    const result =
      kind === "make"
        ? await submitMake()
        : kind === "model"
          ? await submitModel()
          : kind === "generation"
            ? await submitGeneration()
            : await submitEngine();
    setSaving(false);

    if (!result.ok) {
      if (result.message) showToast(result.message, "danger");
      return;
    }
    showToast(entity ? "تغییرات ذخیره شد" : "ثبت شد", "success");
    onSaved();
  }

  const localizedNameFields = (
    <>
      <TextField
        label="نام فارسی"
        value={form.nameFa}
        error={Boolean(errors["name.fa"])}
        helperText={errors["name.fa"]}
        onChange={(event) => setForm({ ...form, nameFa: event.target.value })}
        fullWidth
      />
      <TextField
        label="نام انگلیسی"
        value={form.nameEn}
        error={Boolean(errors["name.en"])}
        helperText={errors["name.en"]}
        onChange={(event) => setForm({ ...form, nameEn: event.target.value })}
        fullWidth
      />
    </>
  );

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{entity ? TITLES[kind].edit : TITLES[kind].create}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {kind !== "engine" ? localizedNameFields : null}

          {kind === "make" || kind === "model" ? (
            <TextField
              label="نامک"
              value={form.slug}
              error={Boolean(errors.slug)}
              helperText={errors.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              fullWidth
            />
          ) : null}

          {kind === "make" ? (
            <>
              <TextField
                label="کشور"
                value={form.country}
                error={Boolean(errors.country)}
                helperText={errors.country}
                onChange={(event) => setForm({ ...form, country: event.target.value })}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isDomestic}
                    onChange={(event) => setForm({ ...form, isDomestic: event.target.checked })}
                  />
                }
                label="خودروساز داخلی"
              />
            </>
          ) : null}

          {kind === "model" ? (
            <TextField
              select
              label="نوع بدنه"
              value={form.bodyType}
              onChange={(event) => setForm({ ...form, bodyType: event.target.value })}
              fullWidth
            >
              {BODY_TYPES.map((value) => (
                <MenuItem key={value} value={value}>
                  {BODY_TYPE_LABELS[value] ?? value}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          {kind === "generation" ? (
            <>
              <TextField
                label="سال شروع (میلادی)"
                value={form.yearFrom}
                error={Boolean(errors.yearFrom)}
                helperText={errors.yearFrom}
                onChange={(event) => setForm({ ...form, yearFrom: event.target.value })}
                fullWidth
              />
              {/* "Still in production" is a real, named state -- not an
                  empty end-year field, which would be indistinguishable
                  from someone forgetting to fill it in. */}
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isCurrent}
                    onChange={(event) => setForm({ ...form, isCurrent: event.target.checked })}
                  />
                }
                label="هنوز در تولید است"
              />
              {!form.isCurrent ? (
                <TextField
                  label="سال پایان (میلادی)"
                  value={form.yearTo}
                  error={Boolean(errors.yearTo)}
                  helperText={errors.yearTo}
                  onChange={(event) => setForm({ ...form, yearTo: event.target.value })}
                  fullWidth
                />
              ) : null}
              <FormControlLabel
                control={
                  <Switch
                    checked={form.facelift}
                    onChange={(event) => setForm({ ...form, facelift: event.target.checked })}
                  />
                }
                label="فیس‌لیفت"
              />
            </>
          ) : null}

          {kind === "engine" ? (
            <>
              <TextField
                label="کد موتور"
                value={form.code}
                error={Boolean(errors.code)}
                helperText={errors.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                fullWidth
              />
              <TextField
                label="حجم موتور (لیتر)"
                value={form.displacement}
                error={Boolean(errors.displacement)}
                helperText={errors.displacement ?? "مثلاً ۱٫۵"}
                onChange={(event) => setForm({ ...form, displacement: event.target.value })}
                fullWidth
              />
              <TextField
                select
                label="سوخت"
                value={form.fuel}
                onChange={(event) => setForm({ ...form, fuel: event.target.value })}
                fullWidth
              >
                {FUEL_TYPES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {FUEL_LABELS[value] ?? value}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="قدرت (اسب بخار)"
                value={form.power}
                error={Boolean(errors.power)}
                helperText={errors.power}
                onChange={(event) => setForm({ ...form, power: event.target.value })}
                fullWidth
              />
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          انصراف
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={saving}>
          ذخیره
        </Button>
      </DialogActions>
    </Dialog>
  );
}
