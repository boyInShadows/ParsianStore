"use client";

import type { ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { muiTheme } from "@/lib/mui-theme";

/**
 * `muiTheme` and the stylis plugins are created/referenced entirely inside
 * this Client Component. `createTheme()`'s return value carries functions
 * (alpha, lighten, darken, ...) and stylis plugins are functions too --
 * neither can be serialized across the Server->Client boundary, so the
 * (admin) layout (a Server Component) must render this wrapper and pass
 * only `children`, never the theme/cache config as props.
 */
export function MuiProviders({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider
      options={{ key: "muirtl", stylisPlugins: [prefixer, rtlPlugin], enableCssLayer: true }}
    >
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
