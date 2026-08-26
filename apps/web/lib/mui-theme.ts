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
            main: "#1E52D6", // --brand-solid (light) / --color-steel-600
            contrastText: "#FFFFFF", // --brand-fg (light)
          },
          // P11.S1: every status color carries an EXPLICIT contrastText,
          // mirroring the --*-fg tokens. Without it MUI computes its own
          // ink from its `contrastThreshold`, and it chose white on
          // --color-success -- 3.29:1, a real WCAG AA failure that shipped
          // on every filled success Chip in the panel (measured live on
          // /admin/orders' "تحویل داده‌شده" status chip, not just here).
          // tokens.css solved this for the storefront at ADR 0025 with
          // --success-fg/--danger-fg/--info-fg; this mirror never got them.
          error: {
            main: "#C81E4A", // --color-danger (light)
            contrastText: "#FFFFFF", // --danger-fg (light) -- 5.61:1
          },
          warning: {
            main: "#E8A317", // --color-warning (light)
            // No --warning-fg exists: the storefront never fills warning
            // (§6.3 keeps it outlined so it cannot read as a CTA). MUI does
            // fill it, so it needs an ink -- dark, same choice --success-fg
            // makes against a bright amber-green. 9.05:1.
            contrastText: "#080C0F", // --color-graphite-1000
          },
          success: {
            main: "#16A34A", // --color-success (light)
            contrastText: "#080C0F", // --success-fg (light) -- 5.96:1
          },
          info: {
            main: "#1E52D6", // --color-info (light) -- now aliases brand
            contrastText: "#FFFFFF", // --info-fg (light) -- 6.50:1
          },
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
            main: "#2E6BEF", // --brand-solid (dark) / --color-steel-500
            contrastText: "#FFFFFF", // --brand-fg (dark)
          },
          // P11.S1 -- see the light scheme's note. Dark flips danger's ink:
          // the dark red is bright enough that white drops to 3.38:1, which
          // is why --danger-fg is dark in this theme and light in the other.
          error: {
            main: "#F0527D", // --color-danger (dark)
            contrastText: "#080C0F", // --danger-fg (dark) -- 5.80:1
          },
          warning: {
            main: "#F5B93C", // --color-warning (dark)
            contrastText: "#080C0F", // 11.11:1
          },
          success: {
            main: "#31C46A", // --color-success (dark)
            contrastText: "#080C0F", // --success-fg -- 8.63:1
          },
          info: {
            main: "#2E6BEF", // --color-info (dark) -- now aliases brand
            contrastText: "#FFFFFF", // --info-fg (dark) -- 4.70:1
          },
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
    components: {
      MuiTab: {
        styleOverrides: {
          root: {
            // tokens.css splits the brand into two roles on purpose:
            // --brand is the TEXT blue, --brand-solid the FILL blue. This
            // palette can only carry one `primary.main`, and it carries the
            // fill -- so MUI painted the selected tab's LABEL with the fill
            // colour, measuring 3.94:1 on --bg in dark mode. Real AA
            // failure, pre-existing on every admin Tabs surface
            // (AdminCatalogTabs, AdminVehicleTabs), found at P11.S1.
            //
            // A var() is legal here for the same reason it is on
            // typography.fontFamily above and illegal in `palette`: nothing
            // runs colour algebra on a styleOverrides value, it goes
            // straight to CSS. That also means this one line fixes both
            // schemes, since --brand already flips itself.
            "&.Mui-selected": { color: "var(--brand)" },
          },
        },
      },
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
