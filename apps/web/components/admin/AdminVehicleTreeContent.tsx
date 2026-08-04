"use client"; // A cascading selection browser -- every column's contents
// depend on client-side selection state.

import { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, Paper, Skeleton, Stack, Typography, alpha } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import {
  toPersianDigits,
  type AdminVehicleEngineDto,
  type AdminVehicleGenDto,
  type AdminVehicleMakeDto,
  type AdminVehicleModelDto,
} from "schemas";
import {
  deleteAdminEngine,
  deleteAdminGeneration,
  deleteAdminMake,
  deleteAdminModel,
  fetchAdminEngines,
  fetchAdminGenerations,
  fetchAdminMakes,
  fetchAdminModels,
} from "@/lib/fetchers/admin-vehicles";
import { useToastStore } from "@/stores/toast-store";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminVehicleTabs } from "./AdminVehicleTabs";
import {
  AdminVehicleFormDialog,
  BODY_TYPE_LABELS,
  FUEL_LABELS,
  type VehicleEntity,
  type VehicleEntityKind,
} from "./AdminVehicleFormDialog";

/**
 * P8.S6 §3.7. Four columns rather than four separate DataGrid screens:
 * the vehicle data IS a tree, and staff work down it (Saipa -> Pride ->
 * 131 -> M13) rather than looking up an engine in isolation. A column
 * browser makes the parent context permanently visible, which a grid with
 * a `genId` filter dropdown cannot.
 */

interface ColumnRow {
  id: string;
  title: string;
  subtitle?: string;
  badges?: { label: string; tone?: "primary" | "default" }[];
  /** Blocks deletion; surfaced so the button is not guess-and-fail. */
  usage: number;
}

function Column({
  title,
  hint,
  rows,
  loading,
  selectedId,
  disabled,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: {
  title: string;
  hint: string;
  rows: ColumnRow[];
  loading: boolean;
  selectedId: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        border: 1,
        borderColor: "divider",
        // A waiting column recedes rather than disappearing, so the shape
        // of the whole tree stays visible while a parent is unselected.
        // Expressed as a muted SURFACE, not `opacity` -- opacity dims the
        // text too, and at 0.55 the column heading measured 4.04:1 in the
        // light palette (axe, on the real screen). The disabled add button
        // and the placeholder line carry the state; the heading stays
        // fully legible.
        bgcolor: disabled ? "action.hover" : "background.paper",
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: "0.9375rem", fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography noWrap sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
            {hint}
          </Typography>
        </Box>
        <Button size="small" variant="outlined" disabled={disabled} onClick={onCreate}>
          افزودن
        </Button>
      </Stack>

      <Box sx={{ flex: 1, p: 1, maxHeight: 460, overflowY: "auto" }}>
        {loading ? (
          <Stack spacing={1} sx={{ p: 0.5 }}>
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} variant="rounded" height={52} />
            ))}
          </Stack>
        ) : rows.length === 0 ? (
          <Typography sx={{ p: 2, fontSize: "0.8125rem", color: "text.secondary" }}>
            {disabled ? "ابتدا از ستون قبل یک مورد انتخاب کنید" : "موردی ثبت نشده است"}
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {rows.map((row) => {
              const isSelected = row.id === selectedId;
              return (
                <Box
                  key={row.id}
                  sx={{
                    borderRadius: 1,
                    px: 1.25,
                    py: 1,
                    cursor: "pointer",
                    border: 1,
                    borderColor: isSelected ? "primary.main" : "transparent",
                    bgcolor: (theme: Theme) =>
                      isSelected ? alpha(theme.palette.primary.main, 0.08) : "transparent",
                    transition: "background-color 160ms ease, border-color 160ms ease",
                    "&:hover": { bgcolor: "action.hover" },
                    "@media (prefers-reduced-motion: reduce)": { transition: "none" },
                  }}
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={() => onSelect(row.id)}
                    aria-pressed={isSelected}
                    sx={{
                      display: "block",
                      inlineSize: "100%",
                      textAlign: "start",
                      border: 0,
                      bgcolor: "transparent",
                      p: 0,
                      font: "inherit",
                      color: "inherit",
                      cursor: "pointer",
                      borderRadius: 1,
                      "&:focus-visible": {
                        outline: 2,
                        outlineColor: "primary.main",
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <Typography noWrap sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {row.title}
                    </Typography>
                    {row.subtitle ? (
                      <Typography noWrap sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                        {row.subtitle}
                      </Typography>
                    ) : null}
                  </Box>
                  <Stack
                    direction="row"
                    sx={{ mt: 0.75, alignItems: "center", gap: 0.5, flexWrap: "wrap" }}
                  >
                    {(row.badges ?? []).map((badge) => (
                      <Chip
                        key={badge.label}
                        size="small"
                        label={badge.label}
                        color={badge.tone === "primary" ? "primary" : "default"}
                        variant={badge.tone === "primary" ? "filled" : "outlined"}
                      />
                    ))}
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" onClick={() => onEdit(row.id)}>
                      ویرایش
                    </Button>
                    <Button size="small" color="error" onClick={() => onDelete(row.id)}>
                      حذف
                    </Button>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Paper>
  );
}

function usageBadges(childCount: number, childLabel: string, fitmentCount: number) {
  const badges: { label: string; tone?: "primary" | "default" }[] = [];
  if (childCount > 0) badges.push({ label: `${toPersianDigits(childCount)} ${childLabel}` });
  if (fitmentCount > 0) {
    badges.push({ label: `${toPersianDigits(fitmentCount)} سازگاری`, tone: "primary" });
  }
  return badges;
}

interface PendingDelete {
  kind: VehicleEntityKind;
  id: string;
  title: string;
  usage: number;
}

export function AdminVehicleTreeContent() {
  const showToast = useToastStore((state) => state.show);

  const [makes, setMakes] = useState<AdminVehicleMakeDto[]>([]);
  const [models, setModels] = useState<AdminVehicleModelDto[]>([]);
  const [generations, setGenerations] = useState<AdminVehicleGenDto[]>([]);
  const [engines, setEngines] = useState<AdminVehicleEngineDto[]>([]);

  const [makeId, setMakeId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [genId, setGenId] = useState<string | null>(null);

  const [loading, setLoading] = useState({
    makes: true,
    models: false,
    gens: false,
    engines: false,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const [dialog, setDialog] = useState<{
    kind: VehicleEntityKind;
    entity: VehicleEntity | null;
    parentId: string | null;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminMakes().then((page) => {
      if (cancelled) return;
      setMakes(page?.data ?? []);
      setLoading((state) => ({ ...state, makes: false }));
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    // No clearing here: a synchronous setState inside an effect body is a
    // cascading render (react-hooks/set-state-in-effect). The child lists
    // are emptied by whoever changes the selection instead -- see
    // selectMake/selectModel/selectGeneration and handleDelete.
    if (!makeId) return;
    let cancelled = false;
    void fetchAdminModels({ makeId }).then((page) => {
      if (cancelled) return;
      setModels(page?.data ?? []);
      setLoading((state) => ({ ...state, models: false }));
    });
    return () => {
      cancelled = true;
    };
  }, [makeId, reloadKey]);

  useEffect(() => {
    if (!modelId) return;
    let cancelled = false;
    void fetchAdminGenerations({ modelId }).then((page) => {
      if (cancelled) return;
      setGenerations(page?.data ?? []);
      setLoading((state) => ({ ...state, gens: false }));
    });
    return () => {
      cancelled = true;
    };
  }, [modelId, reloadKey]);

  useEffect(() => {
    if (!genId) return;
    let cancelled = false;
    void fetchAdminEngines({ genId }).then((page) => {
      if (cancelled) return;
      setEngines(page?.data ?? []);
      setLoading((state) => ({ ...state, engines: false }));
    });
    return () => {
      cancelled = true;
    };
  }, [genId, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // Selecting a parent invalidates every selection to its left -- keeping
  // a stale generation selected while its model changed would show engines
  // belonging to a car nobody is looking at.
  function selectMake(id: string): void {
    setLoading((state) => ({ ...state, models: true }));
    setMakeId(id);
    setModelId(null);
    setGenId(null);
    setModels([]);
    setGenerations([]);
    setEngines([]);
  }

  function selectModel(id: string): void {
    setLoading((state) => ({ ...state, gens: true }));
    setModelId(id);
    setGenId(null);
    setGenerations([]);
    setEngines([]);
  }

  function selectGeneration(id: string): void {
    setLoading((state) => ({ ...state, engines: true }));
    setGenId(id);
    setEngines([]);
  }

  const DELETERS: Record<
    VehicleEntityKind,
    (id: string) => Promise<{ ok: boolean; message?: string }>
  > = {
    make: async (id) => normalize(await deleteAdminMake(id)),
    model: async (id) => normalize(await deleteAdminModel(id)),
    generation: async (id) => normalize(await deleteAdminGeneration(id)),
    engine: async (id) => normalize(await deleteAdminEngine(id)),
  };

  function normalize(response: { ok: true } | { ok: false; message: string }) {
    return response.ok ? { ok: true } : { ok: false, message: response.message };
  }

  async function handleDelete(): Promise<void> {
    if (!pendingDelete) return;
    setBusy(true);
    const result = await DELETERS[pendingDelete.kind](pendingDelete.id);
    setBusy(false);
    setPendingDelete(null);
    if (!result.ok) {
      showToast(result.message ?? "حذف ممکن نشد", "danger");
      return;
    }
    // Clearing the selection matters when the deleted row WAS the
    // selection: the columns to its left would otherwise keep showing its
    // children.
    if (pendingDelete.kind === "make" && pendingDelete.id === makeId) {
      setMakeId(null);
      setModels([]);
      setGenerations([]);
      setEngines([]);
    }
    if (pendingDelete.kind === "model" && pendingDelete.id === modelId) {
      setModelId(null);
      setGenerations([]);
      setEngines([]);
    }
    if (pendingDelete.kind === "generation" && pendingDelete.id === genId) {
      setGenId(null);
      setEngines([]);
    }
    showToast("حذف شد", "success");
    reload();
  }

  function askDelete(kind: VehicleEntityKind, id: string, title: string, usage: number): void {
    setPendingDelete({ kind, id, title, usage });
  }

  const makeRows: ColumnRow[] = makes.map((make) => ({
    id: make.id,
    title: make.name.fa,
    subtitle: make.slug,
    badges: usageBadges(make.modelCount, "مدل", make.fitmentCount),
    usage: make.modelCount + make.fitmentCount,
  }));

  const modelRows: ColumnRow[] = models.map((model) => ({
    id: model.id,
    title: model.name.fa,
    subtitle: BODY_TYPE_LABELS[model.bodyType] ?? model.bodyType,
    badges: usageBadges(model.generationCount, "نسل", model.fitmentCount),
    usage: model.generationCount + model.fitmentCount,
  }));

  const generationRows: ColumnRow[] = generations.map((generation) => ({
    id: generation.id,
    title: generation.name.fa,
    subtitle: `${toPersianDigits(generation.yearFrom)} تا ${
      generation.yearTo === null ? "اکنون" : toPersianDigits(generation.yearTo)
    }`,
    badges: usageBadges(generation.engineCount, "موتور", generation.fitmentCount),
    usage: generation.engineCount + generation.fitmentCount,
  }));

  const engineRows: ColumnRow[] = engines.map((engine) => ({
    id: engine.id,
    title: engine.code,
    subtitle: `${toPersianDigits(engine.displacement)} لیتر · ${
      FUEL_LABELS[engine.fuel] ?? engine.fuel
    } · ${toPersianDigits(engine.power)} اسب بخار`,
    badges: usageBadges(0, "", engine.fitmentCount),
    usage: engine.fitmentCount,
  }));

  function findEntity(kind: VehicleEntityKind, id: string): VehicleEntity | null {
    const source =
      kind === "make"
        ? makes
        : kind === "model"
          ? models
          : kind === "generation"
            ? generations
            : engines;
    return (source as VehicleEntity[]).find((entity) => entity.id === id) ?? null;
  }

  return (
    <Stack spacing={2.5}>
      <AdminVehicleTabs active="tree" />

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
          درخت خودروها
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: "0.875rem", color: "text.secondary" }}>
          برند، مدل، نسل و موتور — همان مسیری که خریدار در انتخابگر خودرو طی می‌کند
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },
        }}
      >
        <Column
          title="برند خودرو"
          hint="سایپا، ایران‌خودرو، …"
          rows={makeRows}
          loading={loading.makes}
          selectedId={makeId}
          disabled={false}
          onSelect={selectMake}
          onCreate={() => setDialog({ kind: "make", entity: null, parentId: null })}
          onEdit={(id) =>
            setDialog({ kind: "make", entity: findEntity("make", id), parentId: null })
          }
          onDelete={(id) =>
            askDelete("make", id, makeRows.find((row) => row.id === id)?.title ?? "", 0)
          }
        />
        <Column
          title="مدل"
          hint={makeId ? "مدل‌های برند انتخاب‌شده" : "ابتدا یک برند انتخاب کنید"}
          rows={modelRows}
          loading={loading.models}
          selectedId={modelId}
          disabled={!makeId}
          onSelect={selectModel}
          onCreate={() => setDialog({ kind: "model", entity: null, parentId: makeId })}
          onEdit={(id) =>
            setDialog({ kind: "model", entity: findEntity("model", id), parentId: makeId })
          }
          onDelete={(id) =>
            askDelete("model", id, modelRows.find((row) => row.id === id)?.title ?? "", 0)
          }
        />
        <Column
          title="نسل"
          hint={modelId ? "نسل‌های مدل انتخاب‌شده" : "ابتدا یک مدل انتخاب کنید"}
          rows={generationRows}
          loading={loading.gens}
          selectedId={genId}
          disabled={!modelId}
          onSelect={selectGeneration}
          onCreate={() => setDialog({ kind: "generation", entity: null, parentId: modelId })}
          onEdit={(id) =>
            setDialog({
              kind: "generation",
              entity: findEntity("generation", id),
              parentId: modelId,
            })
          }
          onDelete={(id) =>
            askDelete("generation", id, generationRows.find((row) => row.id === id)?.title ?? "", 0)
          }
        />
        <Column
          title="موتور"
          hint={genId ? "موتورهای نسل انتخاب‌شده" : "ابتدا یک نسل انتخاب کنید"}
          rows={engineRows}
          loading={loading.engines}
          selectedId={null}
          disabled={!genId}
          onSelect={() => undefined}
          onCreate={() => setDialog({ kind: "engine", entity: null, parentId: genId })}
          onEdit={(id) =>
            setDialog({ kind: "engine", entity: findEntity("engine", id), parentId: genId })
          }
          onDelete={(id) =>
            askDelete("engine", id, engineRows.find((row) => row.id === id)?.title ?? "", 0)
          }
        />
      </Box>

      {dialog ? (
        <AdminVehicleFormDialog
          kind={dialog.kind}
          entity={dialog.entity}
          parentId={dialog.parentId}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            reload();
          }}
        />
      ) : null}

      <AdminConfirmDialog
        open={pendingDelete !== null}
        busy={busy}
        title="حذف از درخت خودروها"
        description={`«${pendingDelete?.title ?? ""}» حذف شود؟ اگر زیرمجموعه یا رکورد سازگاری داشته باشد، حذف انجام نمی‌شود.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </Stack>
  );
}
