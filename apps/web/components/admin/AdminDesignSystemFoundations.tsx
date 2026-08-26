"use client"; // Rendered inside AdminDesignSystemContent's tab panel, which
// owns the selected-tab state. Takes fully-resolved data as props -- the
// parsing itself happens on the server in lib/design-tokens.ts, which uses
// node:fs and must never reach a client bundle.

import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { ContrastPair, DesignTokens, Ramp, TokenGroup } from "@/lib/design-tokens";

// Mono record codes as first-class typography -- the same "Workshop Docket"
// vernacular ADR 0025 established for the storefront's document surfaces,
// carried into the admin so the two halves read as one system.
const MONO = "var(--font-mono), ui-monospace, monospace";

function SectionHeading({ code, title, note }: { code: string; title: string; note: string }) {
  return (
    <Stack spacing={0.5} sx={{ mb: 2 }}>
      <Typography sx={{ fontFamily: MONO, fontSize: 12, color: "text.secondary" }}>
        {code}
      </Typography>
      {/* Explicit `component` -- MUI's variant defaults would emit an <h6>
          here and jump the heading order from the page's own <h2>. */}
      <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {note}
      </Typography>
    </Stack>
  );
}

/** A color chip. The value comes from tokens.css via the parser, so this is
 *  rendered data, never a hex literal in source (CLAUDE.md rule 5). */
function Swatch({ value, size = 44 }: { value: string; size?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: 1,
        backgroundColor: value,
        border: 1,
        borderColor: "divider",
        flexShrink: 0,
      }}
    />
  );
}

function RampBlock({ ramp }: { ramp: Ramp }) {
  return (
    <Box sx={{ mb: 4 }}>
      <SectionHeading code={`RAMP-${ramp.id.toUpperCase()}`} title={ramp.title} note={ramp.note} />
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {ramp.steps.map((step) => (
          <Stack key={step.step} spacing={0.5} sx={{ alignItems: "center", width: 72 }}>
            <Swatch value={step.hex} />
            <Typography sx={{ fontFamily: MONO, fontSize: 11 }}>{step.step}</Typography>
            <Typography sx={{ fontFamily: MONO, fontSize: 10, color: "text.secondary" }}>
              {step.hex}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

/** Radius, spacing and shadow are only meaningful as shapes. Anything else
 *  (a duration, an easing curve, a breakpoint) reads fine as its own text. */
function ValuePreview({ group, value }: { group: string; value: string }) {
  if (value.startsWith("#")) return <Swatch value={value} size={28} />;
  if (group === "radius") {
    return (
      <Box
        aria-hidden
        sx={{
          width: 44,
          height: 28,
          borderRadius: value,
          border: 1,
          borderColor: "text.primary",
        }}
      />
    );
  }
  if (group === "space") {
    return (
      <Box
        aria-hidden
        sx={{ width: value, height: 12, backgroundColor: "primary.main", borderRadius: 0.5 }}
      />
    );
  }
  if (group === "shadow") {
    return (
      <Box
        aria-hidden
        sx={{
          width: 44,
          height: 28,
          borderRadius: 1,
          backgroundColor: "background.paper",
          boxShadow: value === "none" ? "none" : value,
          border: value === "none" ? 1 : 0,
          borderColor: "divider",
        }}
      />
    );
  }
  return null;
}

function TokenTable({ group }: { group: TokenGroup }) {
  // Collapse the second column when every token in the group resolves the
  // same in both themes -- true for radius, spacing, motion and layout.
  const themed = group.tokens.some((token) => !token.shared);

  return (
    <Box sx={{ mb: 4 }}>
      <SectionHeading
        code={`TOK-${group.id.toUpperCase()}`}
        title={group.title}
        note={group.note}
      />
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>توکن</TableCell>
              <TableCell>{themed ? "روشن" : "مقدار"}</TableCell>
              {themed && <TableCell>تیره</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {group.tokens.map((token) => (
              <TableRow key={token.name}>
                <TableCell sx={{ fontFamily: MONO, whiteSpace: "nowrap" }}>
                  --{token.name}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <ValuePreview group={group.id} value={token.light} />
                    <Typography sx={{ fontFamily: MONO, fontSize: 12 }}>{token.light}</Typography>
                  </Stack>
                </TableCell>
                {themed && (
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <ValuePreview group={group.id} value={token.dark} />
                      <Typography sx={{ fontFamily: MONO, fontSize: 12 }}>{token.dark}</Typography>
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function verdict(ratio: number | null, min: number | null) {
  if (ratio === null) return { label: "—", color: "default" as const };
  if (min === null) return { label: "اطلاعی", color: "default" as const };
  return ratio >= min
    ? { label: "قبول", color: "success" as const }
    : { label: "مردود", color: "error" as const };
}

function ContrastTable({ pairs }: { pairs: ContrastPair[] }) {
  // Type predicate rather than a `!` assertion: the informational rows carry
  // no minimum, and narrowing them out here is what makes the comparison
  // below provably safe instead of asserted-safe.
  const graded = pairs.filter((pair): pair is ContrastPair & { min: number } => pair.min !== null);
  const failing = graded.filter(
    (pair) =>
      (pair.light !== null && pair.light < pair.min) ||
      (pair.dark !== null && pair.dark < pair.min),
  );

  return (
    <Box sx={{ mb: 4 }}>
      <SectionHeading
        code="A11Y-CONTRAST"
        title="نسبت کنتراست"
        note="از روی همان مقادیر واقعی tokens.css و با فرمول درخشندگی نسبی WCAG محاسبه می‌شود — رونویسی از مستندات نیست، پس بررسی مستقلی روی آن‌هاست."
      />
      <Chip
        size="small"
        color={failing.length === 0 ? "success" : "error"}
        label={
          failing.length === 0
            ? `هر ${graded.length} جفتِ سنجیده، در هر دو تم قبول`
            : `${failing.length} جفت مردود`
        }
        sx={{ mb: 2 }}
      />
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>جفت</TableCell>
              <TableCell>توکن‌ها</TableCell>
              <TableCell>حداقل</TableCell>
              <TableCell>روشن</TableCell>
              <TableCell>تیره</TableCell>
              <TableCell>وضعیت</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pairs.map((pair) => {
              const light = verdict(pair.light, pair.min);
              const dark = verdict(pair.dark, pair.min);
              return (
                <TableRow key={`${pair.fg}-${pair.bg}`}>
                  <TableCell>
                    <Typography variant="body2">{pair.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {pair.note}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: MONO, fontSize: 12, whiteSpace: "nowrap" }}>
                    --{pair.fg} / --{pair.bg}
                  </TableCell>
                  <TableCell sx={{ fontFamily: MONO }}>{pair.min ?? "—"}</TableCell>
                  <TableCell sx={{ fontFamily: MONO }}>{pair.light ?? "—"}</TableCell>
                  <TableCell sx={{ fontFamily: MONO }}>{pair.dark ?? "—"}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Chip size="small" color={light.color} label={light.label} />
                      {light.label !== dark.label && (
                        <Chip size="small" color={dark.color} label={dark.label} />
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function TypographyBlock({ tokens }: { tokens: DesignTokens }) {
  return (
    <Box sx={{ mb: 4 }}>
      <SectionHeading
        code="TYPE-SCALE"
        title="تایپوگرافی"
        note="سه خانواده، خودمیزبان و زیرمجموعه‌شده (WOFF2، بدون CDN). مقیاس از tailwind.config.js خوانده می‌شود؛ پله‌ای بیرون این فهرست اصلاً CSS تولید نمی‌کند."
      />
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>توکن</TableCell>
              <TableCell>خانواده</TableCell>
              <TableCell>وزن‌ها</TableCell>
              <TableCell>نقش</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tokens.fonts.map((font) => (
              <TableRow key={font.token}>
                <TableCell sx={{ fontFamily: MONO, whiteSpace: "nowrap" }}>{font.token}</TableCell>
                <TableCell>{font.family}</TableCell>
                <TableCell sx={{ fontFamily: MONO }}>{font.weights}</TableCell>
                <TableCell>{font.role}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>پله</TableCell>
              <TableCell>اندازه</TableCell>
              <TableCell>ارتفاع خط</TableCell>
              <TableCell>فاصلهٔ حروف</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tokens.typeScale.map((step) => (
              <TableRow key={step.name}>
                <TableCell sx={{ fontFamily: MONO, whiteSpace: "nowrap" }}>
                  text-{step.name}
                </TableCell>
                <TableCell sx={{ fontFamily: MONO, fontSize: 12 }}>{step.size}</TableCell>
                <TableCell sx={{ fontFamily: MONO }}>{step.lineHeight}</TableCell>
                <TableCell sx={{ fontFamily: MONO }}>{step.letterSpacing}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        مقیاس عمداً در h3 متوقف می‌شود؛ h4 یک پلهٔ گم‌شده نیست (ADR 0025).
      </Typography>
    </Box>
  );
}

export function AdminDesignSystemFoundations({ tokens }: { tokens: DesignTokens }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: "72ch" }}>
        هر مقدار این صفحه هنگام رندر از <code style={{ fontFamily: MONO }}>styles/tokens.css</code>{" "}
        و <code style={{ fontFamily: MONO }}>tailwind.config.js</code> خوانده می‌شود، نه
        رونویسی‌شده. پس توکنی که آنجا عوض شود همین‌جا عوض می‌شود و توکنی که حذف شود از این صفحه
        ناپدید می‌شود — این صفحه هیچ‌وقت کهنه نمی‌ماند. tokens.css تنها فایل مجاز برای مقدار رنگ خام
        است.
      </Typography>

      {tokens.ramps.map((ramp) => (
        <RampBlock key={ramp.id} ramp={ramp} />
      ))}

      <ContrastTable pairs={tokens.contrast} />
      <TypographyBlock tokens={tokens} />

      {tokens.groups.map((group) => (
        <TokenTable key={group.id} group={group} />
      ))}
    </Box>
  );
}
