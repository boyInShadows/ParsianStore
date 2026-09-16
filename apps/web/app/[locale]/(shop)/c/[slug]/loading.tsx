// The whole file, on purpose: the HiggsField swap (P15.S3 owner decision) must
// stay a one-component change, so every loading.tsx in the shop group re-exports
// the single seam rather than rendering markup of its own. The seam is
// `components/loading/ShopRouteLoader.tsx` + WorkshopLoader.tsx's `--loader-*`
// token block. `loading-boundaries.test.ts` asserts this exact line.
//
// Safe here because `layout.tsx` beside this file resolves the not-found
// decision above the Suspense boundary — see its doc comment. The page keeps its
// own `notFound()` as a second line of defence; that is not a contradiction, it
// is what makes this route correct with or without the boundary.
export { ShopRouteLoader as default } from "@/components/loading";
