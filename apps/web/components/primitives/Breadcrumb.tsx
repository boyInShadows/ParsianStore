type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  items: Crumb[];
};

export function Breadcrumb({ items }: Props) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-body-sm text-text-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {isLast || !item.href ? (
                <span aria-current={isLast ? "page" : undefined} className="text-text">
                  {item.label}
                </span>
              ) : (
                <a href={item.href} className="hover:text-brand hover:underline">
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
