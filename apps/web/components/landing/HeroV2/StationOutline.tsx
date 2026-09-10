import { getTranslations } from "next-intl/server";
import { CHAPTER_SEQUENCE } from "./heroLayout";
import { calloutSubjectByLayerId } from "./manifestData";

/**
 * The animation, written down (fableTasks v1.1 P13.S11).
 *
 * The hero tells its story through motion: the car comes apart one station at a
 * time, and the order it comes apart in *is* the content -- front of the car,
 * then under the bonnet, then the body. A visitor who cannot watch that gets
 * the parts from the job card, but not the sequence, because nothing else on
 * the page states it. The captions do, one at a time, only while their beat is
 * on screen; `StageSteps` moves between the stations but never names them.
 *
 * So this is the outline of the scene as prose: three chapters, nine stations,
 * in the order they play.
 *
 * ## Why it is `sr-only` and not hidden
 *
 * `sr-only` clips the text out of the visual layout while leaving it in the
 * accessibility tree *and* in the document -- so this serves a screen-reader
 * visitor and a crawler with the same markup. `display: none`, `hidden`, or
 * `aria-hidden` would each drop one of the two audiences. It is deliberately
 * not shown on screen: sighted visitors already have the sequence, animated,
 * and printing it again beside the drawing is a duplicate list, which is the
 * failure mode P13.S7 spent a step removing from the manifest.
 *
 * ## Derived, so it cannot go stale
 *
 * The order comes from `CHAPTER_SEQUENCE` -- the same table the beats are
 * solved from -- and the names from `calloutSubjectByLayerId`, the same map the
 * plates read. Retuning the sequence moves this list with it. A hand-written
 * outline would be correct exactly once, and would then quietly describe an
 * animation the page no longer plays, which is worse than having no outline:
 * it is a confident wrong answer given only to the people who cannot check it.
 *
 * A slot's first layer id is enough to name it. The two ids in a slot are only
 * ever the two halves of one part (the headlights), and they share a subject.
 */
export async function StationOutline() {
  const t = await getTranslations("Landing.manifest");
  const byLayer = calloutSubjectByLayerId();

  return (
    <section className="sr-only" aria-labelledby="hero-stations-heading">
      <h2 id="hero-stations-heading">{t("stations")}</h2>
      <ol>
        {([1, 2, 3] as const).map((chapter) => (
          <li key={chapter}>
            {t(`chapters.${chapter}`)}
            <ol>
              {CHAPTER_SEQUENCE[chapter].map((layerIds) => {
                const subject = byLayer.get(layerIds[0]!);
                if (!subject) {
                  throw new Error(
                    `Hero station "${layerIds.join("+")}" has no callout subject. Every slot in ` +
                      `CHAPTER_SEQUENCE is a part the scene names, so a slot with no subject is a ` +
                      `part that animates unnamed -- fix the sequence or the manifest, not this list.`,
                  );
                }
                return <li key={layerIds.join("+")}>{t(`parts.${subject.nameKey}`)}</li>;
              })}
            </ol>
          </li>
        ))}
      </ol>
    </section>
  );
}
