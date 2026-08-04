// This barrel is imported by client trees (/cart, /checkout, /addresses) as
// well as by server pages, so everything exported here is paid for by every
// one of them.
//
// MEASURED, not assumed: adding the six new document primitives (PageHeader,
// Sheet, DataRow, Receipt, PriceTag, LinkPagination) here cost /addresses
// +8KB First Load JS with zero changes to that page -- webpack does not
// tree-shake them back out across the "use client" boundary. They are
// therefore imported by file path instead, the same rule ProductCard and
// WishlistButton already follow. Only add to this barrel something every
// consumer genuinely uses.
export { Button } from "./Button";
export { ButtonLink } from "./ButtonLink";
export { Input } from "./Input";
export { Select } from "./Select";
export { Textarea } from "./Textarea";
export { Checkbox } from "./Checkbox";
export { Radio } from "./Radio";
export { Badge } from "./Badge";
export { Chip } from "./Chip";
export { Card } from "./Card";
export { Modal } from "./Modal";
export { Drawer } from "./Drawer";
export { Tabs } from "./Tabs";
export { Tooltip } from "./Tooltip";
export { Skeleton } from "./Skeleton";
export { Toaster } from "./Toast";
export { Pagination } from "./Pagination";
export { Breadcrumb } from "./Breadcrumb";
export { EmptyState } from "./EmptyState";
