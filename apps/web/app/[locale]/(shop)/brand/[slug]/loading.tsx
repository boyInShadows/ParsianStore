// One line, on purpose — the HiggsField swap (P15.S3 owner decision) must stay a
// one-component change, so every loading.tsx re-exports the single seam,
// `components/loading/ShopRouteLoader.tsx`, instead of rendering its own markup.
// Safe here because `layout.tsx` beside this file resolves the not-found
// decision above the Suspense boundary; see its doc comment.
export { ShopRouteLoader as default } from "@/components/loading";
