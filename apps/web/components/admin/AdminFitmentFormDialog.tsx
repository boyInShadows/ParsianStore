"use client"; // Cascading vehicle selects and a debounced product search --
// all client state.

import { useEffect, useState } from "react";
import {
  Autocomplete,
  Button,
  CircularProgress,
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
  ADMIN_FITMENT_CONFIDENCES,
  adminCreateFitmentInputSchema,
  toEnglishDigits,
  toPersianDigits,
  type AdminFitmentDto,
  type AdminVehicleEngineDto,
  type AdminVehicleGenDto,
  type AdminVehicleMakeDto,
  type AdminVehicleModelDto,
} from "schemas";
import { fetchAdminProducts } from "@/lib/fetchers/admin-products";
import {
  createAdminFitment,
  fetchAdminEngines,
  fetchAdminGenerations,
  fetchAdminMakes,
  fetchAdminModels,
  updateAdminFitment,
} from "@/lib/fetchers/admin-vehicles";
import { useToastStore } from "@/stores/toast-store";

export const CONFIDENCE_LABELS: Record<string, string> = {
  exact: "دقیق",
  likely: "محتمل",
  check: "نیازمند بررسی",
};

type ProductOption = { id: string; label: string; sku: string };

// No `open` prop -- see AdminCategoryFormDialog for the reasoning.
type Props = {
  fitment: AdminFitmentDto | null;
  onClose: () => void;
  onSaved: () => void;
};

function toNumber(input: string): number {
  return Number(toEnglishDigits(input).replace(/[^\d-]/g, ""));
}

export function AdminFitmentFormDialog({ fitment, onClose, onSaved }: Props) {
  const showToast = useToastStore((state) => state.show);

  const [product, setProduct] = useState<ProductOption | null>(
    fitment ? { id: fitment.productId, label: fitment.productName, sku: fitment.productSku } : null,
  );
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  const [makes, setMakes] = useState<AdminVehicleMakeDto[]>([]);
  const [models, setModels] = useState<AdminVehicleModelDto[]>([]);
  const [generations, setGenerations] = useState<AdminVehicleGenDto[]>([]);
  const [engines, setEngines] = useState<AdminVehicleEngineDto[]>([]);

  const [makeId, setMakeId] = useState(fitment?.makeId ?? "");
  const [modelId, setModelId] = useState(fitment?.modelId ?? "");
  const [genId, setGenId] = useState(fitment?.genId ?? "");
  const [engineId, setEngineId] = useState(fitment?.engineId ?? "");

  const [yearFrom, setYearFrom] = useState(fitment ? String(fitment.yearFrom) : "");
  const [yearTo, setYearTo] = useState(
    fitment && fitment.yearTo !== null ? String(fitment.yearTo) : "",
  );
  const [isCurrent, setIsCurrent] = useState(fitment ? fitment.yearTo === null : false);
  const [confidence, setConfidence] = useState(fitment?.confidence ?? "exact");
  const [note, setNote] = useState(fitment?.note ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminMakes().then((page) => {
      if (!cancelled) setMakes(page?.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // No clearing here: a synchronous setState inside an effect body is a
    // cascading render (react-hooks/set-state-in-effect). The narrower
    // lists are emptied by the select handlers that change the parent.
    if (!makeId) return;
    let cancelled = false;
    void fetchAdminModels({ makeId }).then((page) => {
      if (!cancelled) setModels(page?.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [makeId]);

  useEffect(() => {
    if (!modelId) return;
    let cancelled = false;
    void fetchAdminGenerations({ modelId }).then((page) => {
      if (!cancelled) setGenerations(page?.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [modelId]);

  useEffect(() => {
    if (!genId) return;
    let cancelled = false;
    void fetchAdminEngines({ genId }).then((page) => {
      if (!cancelled) setEngines(page?.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [genId]);

  // Debounced, and only once there is something to search for -- the
  // catalog is far too large to put in a dropdown wholesale.
  useEffect(() => {
    // The short-query case is handled by the onInputChange handler
    // clearing the options, not here -- see the setState-in-effect note on
    // the vehicle effects above.
    if (productQuery.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void fetchAdminProducts(1, 20, undefined, productQuery.trim()).then((page) => {
        if (cancelled) return;
        setProductOptions(
          (page?.data ?? []).map((row) => ({ id: row.id, label: row.name.fa, sku: row.sku })),
        );
        setProductLoading(false);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [productQuery]);

  async function handleSubmit(): Promise<void> {
    const candidate = {
      productId: product?.id ?? "",
      makeId,
      modelId,
      ...(genId ? { genId } : {}),
      ...(engineId ? { engineId } : {}),
      yearFrom: toNumber(yearFrom),
      yearTo: isCurrent ? null : toNumber(yearTo),
      ...(note.trim() ? { note: note.trim() } : {}),
      confidence,
    };

    const parsed = adminCreateFitmentInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[issue.path.join(".") || "form"] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const response = fitment
      ? await updateAdminFitment(fitment.id, parsed.data)
      : await createAdminFitment(parsed.data);
    setSaving(false);

    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast(fitment ? "رکورد سازگاری به‌روزرسانی شد" : "رکورد سازگاری ثبت شد", "success");
    onSaved();
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{fitment ? "ویرایش سازگاری" : "سازگاری جدید"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Autocomplete
            value={product}
            options={productOptions}
            loading={productLoading}
            filterOptions={(options) => options}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => `${option.label} — ${option.sku}`}
            onInputChange={(_event, value) => {
              const isSearchable = value.trim().length >= 2;
              setProductLoading(isSearchable);
              if (!isSearchable) setProductOptions([]);
              setProductQuery(value);
            }}
            onChange={(_event, value) => setProduct(value)}
            noOptionsText={
              productQuery.trim().length < 2 ? "نام یا کد محصول را بنویسید" : "محصولی یافت نشد"
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="محصول"
                error={Boolean(errors.productId)}
                helperText={errors.productId}
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {productLoading ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />

          <TextField
            select
            label="برند خودرو"
            value={makeId}
            error={Boolean(errors.makeId)}
            helperText={errors.makeId}
            onChange={(event) => {
              // Every narrower selection is cleared -- keeping a Pride
              // generation selected after switching to Iran Khodro would
              // build a record the API rightly refuses.
              setMakeId(event.target.value);
              setModelId("");
              setGenId("");
              setEngineId("");
              setModels([]);
              setGenerations([]);
              setEngines([]);
            }}
            fullWidth
          >
            {makes.map((make) => (
              <MenuItem key={make.id} value={make.id}>
                {make.name.fa}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="مدل"
            value={modelId}
            disabled={!makeId}
            error={Boolean(errors.modelId)}
            helperText={errors.modelId}
            onChange={(event) => {
              setModelId(event.target.value);
              setGenId("");
              setEngineId("");
              setGenerations([]);
              setEngines([]);
            }}
            fullWidth
          >
            {models.map((model) => (
              <MenuItem key={model.id} value={model.id}>
                {model.name.fa}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="نسل (اختیاری)"
            value={genId}
            disabled={!modelId}
            helperText="خالی بگذارید تا برای همه نسل‌ها اعمال شود"
            onChange={(event) => {
              setGenId(event.target.value);
              setEngineId("");
              setEngines([]);
            }}
            fullWidth
          >
            <MenuItem value="">همه نسل‌ها</MenuItem>
            {generations.map((generation) => (
              <MenuItem key={generation.id} value={generation.id}>
                {generation.name.fa} ({toPersianDigits(generation.yearFrom)}–
                {generation.yearTo === null ? "اکنون" : toPersianDigits(generation.yearTo)})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="موتور (اختیاری)"
            value={engineId}
            disabled={!genId}
            error={Boolean(errors.engineId)}
            helperText={errors.engineId ?? "خالی بگذارید تا برای همه موتورها اعمال شود"}
            onChange={(event) => setEngineId(event.target.value)}
            fullWidth
          >
            <MenuItem value="">همه موتورها</MenuItem>
            {engines.map((engine) => (
              <MenuItem key={engine.id} value={engine.id}>
                {engine.code} — {toPersianDigits(engine.displacement)} لیتر
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="از سال (میلادی)"
            value={yearFrom}
            error={Boolean(errors.yearFrom)}
            helperText={errors.yearFrom}
            onChange={(event) => setYearFrom(event.target.value)}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={isCurrent}
                onChange={(event) => setIsCurrent(event.target.checked)}
              />
            }
            label="تا امروز ادامه دارد"
          />
          {!isCurrent ? (
            <TextField
              label="تا سال (میلادی)"
              value={yearTo}
              error={Boolean(errors.yearTo)}
              helperText={errors.yearTo}
              onChange={(event) => setYearTo(event.target.value)}
              fullWidth
            />
          ) : null}

          <TextField
            select
            label="میزان اطمینان"
            value={confidence}
            onChange={(event) =>
              setConfidence(event.target.value as (typeof ADMIN_FITMENT_CONFIDENCES)[number])
            }
            fullWidth
          >
            {ADMIN_FITMENT_CONFIDENCES.map((value) => (
              <MenuItem key={value} value={value}>
                {CONFIDENCE_LABELS[value] ?? value}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="یادداشت (اختیاری)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
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
