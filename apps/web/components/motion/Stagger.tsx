import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

type RootProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol" | "aside";
};

/**
 * The named shape of `<Reveal stagger>`, kept because the styleguide documents
 * "a group whose children arrive one after another" as its own idea.
 *
 * It is a thin alias, not a second implementation. P14.S7 moved the reveal off
 * `motion` and onto one shared IntersectionObserver plus CSS; leaving Stagger
 * on `motion.div` variants would have meant two mechanisms with two different
 * timings claiming to be the same page behaviour -- and would have kept a
 * `motion` import alive on a route that no longer needs one.
 *
 * `Stagger.Item` is a plain element: the delay comes from the parent's
 * :nth-child rules, so an item has nothing of its own to do and stays server
 * markup.
 */
function StaggerRoot({ children, className, as }: RootProps) {
  return (
    <Reveal stagger className={className} as={as}>
      {children}
    </Reveal>
  );
}

function Item({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export const Stagger = Object.assign(StaggerRoot, { Item });
