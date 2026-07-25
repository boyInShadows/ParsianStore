import { createTheme } from "@mui/material/styles";
import { faIR as coreFaIR } from "@mui/material/locale";
import { faIR as dataGridFaIR } from "@mui/x-data-grid/locales";

/**
 * MUI theme for the (admin) route group -- masterPlan.md §6.7/§7.3.
 *
 * IMPORTANT, discovered building this: MUI's palette CANNOT take
 * `var(--...)` strings as color values. `createTheme` runs real JS-side
 * color algebra on every palette color (contrast-ratio computation for
 * `contrastText`, `lighten`/`darken` for hover/focus states, `alpha()` in
 * many component style functions at their own render time) via a regex
 * color parser that only understands hex/rgb/hsl -- an opaque CSS custom
 * property fails immediately (MUI error #9). This is the same category of
 * exception as `shape.borderRadius` below: an MUI API constraint, not a
 * design choice. Every literal hex value here is a deliberate, documented
 * exception to "zero hex outside tokens.css" (CLAUDE.md rule 5) -- each is
 * commented with the exact styles/tokens.css custom property it must stay
 * byte-identical to.
 *
 * Dark mode uses MUI's `colorSchemes` (the supported cssVariables-mode
 * mechanism) rather than a single flat palette, with `colorSchemeSelector`
 * pointed at the *same* `[data-theme="..."]` attribute next-themes already
 * manages (P1.S5) -- so toggling the site theme flips MUI's scheme too,
 * with no separate admin-only toggle needed.
 */
export const muiTheme = createTheme(
  {
    direction: "rtl",
    cssVariables: {
      colorSchemeSelector: '[data-theme="%s"]',
    },
    colorSchemes: {
      light: {
        palette: {
          primary: {
            main: "#0A9186", // --brand-solid (light) / --color-firouzeh-600
            contrastText: "#FFFFFF", // --brand-fg (light)
          },
          error: { main: "#DC2626" }, // --color-danger (light)
          warning: { main: "#E8A317" }, // --color-warning (light)
          success: { main: "#16A34A" }, // --color-success (light)
          info: { main: "#2563EB" }, // --color-info (light)
          background: {
            default: "#EEF1F4", // --bg (light)
            paper: "#FFFFFF", // --surface (light)
          },
          text: {
            primary: "#141B21", // --text (light)
            secondary: "#5C6B78", // --text-muted (light)
          },
          divider: "#CBD3DA", // --border (light)
        },
      },
      dark: {
        palette: {
          primary: {
            main: "#0FB5A8", // --brand-solid (dark) / --color-firouzeh-500
            contrastText: "#042B29", // --brand-fg (dark)
          },
          error: { main: "#F0524B" }, // --color-danger (dark)
          warning: { main: "#F5B93C" }, // --color-warning (dark)
          success: { main: "#31C46A" }, // --color-success (dark)
          info: { main: "#5B8DEF" }, // --color-info (dark)
          background: {
            default: "#0E1418", // --bg (dark)
            paper: "#1A222A", // --surface (dark)
          },
          text: {
            primary: "#E2E7EC", // --text (dark)
            secondary: "#A8B4BE", // --text-muted (dark)
          },
          divider: "#36414C", // --border (dark)
        },
      },
    },
    shape: {
      // MUI requires a plain number here (used in arithmetic, e.g.
      // `theme.shape.borderRadius * 1.5`) -- a var(--...) string isn't
      // accepted by the API. Matches --radius-md (10px) from tokens.css;
      // update both together if that token ever changes.
      borderRadius: 10,
    },
    typography: {
      // A plain string, not a color -- no MUI color computation touches this,
      // so a var(--...) reference passes through to CSS verbatim, unlike palette.
      fontFamily: "var(--font-body)",
    },
  },
  // Persian component strings (pagination labels, breadcrumbs expand text,
  // DataGrid footer/menu text, etc.) -- masterPlan.md §7's default locale
  // is fa. createTheme's locale-args form merges these `components`
  // defaultProps overrides on top of the options object above.
  coreFaIR,
  dataGridFaIR,
);
