import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import fa from "../../messages/fa.json";
import { buildVehicleKey } from "schemas";
import { useGarageStore } from "@/stores/garage-store";

import { SavedCarLead } from "./SavedCarLead.js";

const { subtitle, subtitleWithCar } = fa.Landing.beats.findMyPart;

const PRIDE = {
  makeId: "saipa",
  modelId: "pride-131",
  genId: "pride-131-g1",
  year: 1390,
  label: "سایپا پراید ۱۳۱ ۱۳۹۰",
};

/**
 * ## What this guards
 *
 * The step's binding requirement is that the generic line ships in the HTML and
 * the personalization is a *text swap on top of it* -- never a line that
 * appears, grows or rewraps after hydration. Two things have to hold for that,
 * and neither is visible in a diff:
 *
 * 1. **The server render is generic no matter what the store holds.** If it
 *    were not, a returning visitor would get a server/client text mismatch and
 *    React would discard the server HTML for that subtree -- which is the
 *    opposite of a swap.
 * 2. **The template still has its slot.** `subtitleWithCar` without `{car}` is
 *    a sentence about a car it never names, and it would ship silently: the
 *    page renders, the copy reads almost right, and the whole point of the step
 *    is gone.
 */
describe("SavedCarLead", () => {
  it("renders the generic lead on the server even when a car is saved", () => {
    // The state a returning visitor's cookie produces, set directly so the test
    // needs no `document`. `renderToStaticMarkup` still has to emit the generic
    // line: zustand's `persist` reports the pre-rehydration state through
    // `getInitialState`, which is what React reads for the server render and
    // for the hydration render both.
    useGarageStore.setState({ vehicles: [PRIDE], activeKey: buildVehicleKey(PRIDE) });
    try {
      const html = renderToStaticMarkup(
        <SavedCarLead generic={subtitle} personalized={subtitleWithCar} />,
      );
      expect(html).toContain(subtitle);
      expect(html).not.toContain(PRIDE.label);
    } finally {
      useGarageStore.setState({ vehicles: [], activeKey: null });
    }
  });

  it("keeps a `{car}` slot in the copy, and only that one", () => {
    // The component substitutes `{car}` and nothing else, so a template with a
    // second placeholder would ship a literal `{...}` to a returning visitor.
    expect(subtitleWithCar).toContain("{car}");
    expect(subtitleWithCar.replace("{car}", PRIDE.label)).not.toContain("{");
  });
});
