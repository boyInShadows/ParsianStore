"use client"; // Sibling tab panel to the foundations one; same client tree.

import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

/**
 * The storefront primitives are documented by embedding the real
 * /styleguide route rather than re-implementing it here.
 *
 * WHY AN IFRAME, and not just rendering the components: tailwind.config.js
 * deliberately excludes this route group ("!./app/**\/(admin)/**"), so a
 * Tailwind-styled component rendered inside (admin) has no CSS at all.
 * Un-excluding it is the exact configuration that let Tailwind Preflight
 * flatten every MUI control in the panel at P8.S5. An iframe is its own
 * document with its own stylesheet, so the two styling worlds cannot touch
 * -- the P8.S5 trap becomes structurally unreachable instead of merely
 * guarded against. See docs/decisions/0027-design-system-consolidation.md.
 *
 * The iframe is same-origin on purpose: next-themes reads the theme from
 * localStorage, which the embedded document shares with this one, so the
 * storefront preview follows the admin's own light/dark toggle rather than
 * stranding staff on a light preview inside a dark panel.
 */
export function AdminDesignSystemStorefront({ styleguideHref }: { styleguideHref: string }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: "72ch" }}>
        اجزای پایهٔ فروشگاه با Tailwind ساخته شده‌اند و Tailwind عمداً از محدودهٔ پنل مدیریت بیرون
        نگه داشته شده است. برای همین راهنمای فروشگاه به‌صورت سند مستقل و در قاب زیر نمایش داده
        می‌شود؛ این‌طور دو دنیای استایل هیچ‌جا با هم تماس پیدا نمی‌کنند.
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          href={styleguideHref}
          target="_blank"
          rel="noopener"
          startIcon={<OpenInNewIcon />}
        >
          باز کردن راهنمای فروشگاه در برگهٔ جدید
        </Button>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        قاب زیر صفحهٔ واقعی <code>/styleguide</code> است، نه یک نسخهٔ بازنویسی‌شده — هر جزئی که آنجا
        تغییر کند بلافاصله اینجا هم دیده می‌شود.
      </Alert>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Box
          component="iframe"
          src={styleguideHref}
          title="راهنمای اجزای فروشگاه"
          // allow-same-origin is required for next-themes to read the shared
          // localStorage theme; allow-scripts for the modal/drawer/toast
          // demos to work at all. Both are safe here because the embedded
          // document is our own first-party route, not third-party content.
          sandbox="allow-scripts allow-same-origin"
          sx={{
            display: "block",
            width: "100%",
            height: "clamp(600px, calc(100vh - 320px), 1200px)",
            border: 0,
          }}
        />
      </Paper>
    </Box>
  );
}
