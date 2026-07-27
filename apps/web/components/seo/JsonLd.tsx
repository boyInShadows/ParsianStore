import type { JsonLdObject } from "@/lib/json-ld";

type Props = {
  data: JsonLdObject | JsonLdObject[];
};

// dangerouslySetInnerHTML audit (react/security.md): input is always
// server-built from lib/json-ld.ts's own schema.org object literals, never
// user input. `<` is escaped anyway so a stray value can't close the
// </script> tag early -- defense in depth, not because untrusted data
// reaches here today.
export function JsonLd({ data }: Props) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
