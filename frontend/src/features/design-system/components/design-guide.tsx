import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { DESIGN_GUIDE } from "@/constants/design-guide";

import { ColorSection } from "./color-section";
import { ButtonsSection, FormsSection } from "./controls-section";
import {
  CompareSection,
  DataSection,
  DomainSection,
  FeedbackSection,
  IdentitySection,
  OverlaysSection,
} from "./display-sections";
import { FoundationsSection, TypographySection } from "./foundations-section";
import { GuideSection } from "./guide-section";

const texts = DESIGN_GUIDE;

const TOC = [
  ["principios", texts.sections.principles],
  ["color", texts.sections.colors],
  ["contraste", texts.sections.contrast],
  ["tipografia", texts.sections.typography],
  ["fundamentos", texts.sections.foundations],
  ["movimiento", texts.sections.motion],
  ["botones", texts.sections.buttons],
  ["formularios", texts.sections.forms],
  ["tablas", texts.sections.data],
  ["estados", texts.sections.feedback],
  ["capas", texts.sections.overlays],
  ["dominio", texts.sections.domain],
  ["identidad", texts.sections.layout],
  ["modos", texts.sections.compare],
] as const;

/** Guía viva del sistema de diseño: tokens y componentes con todas sus variantes. */
export function DesignGuide() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,5fr)]">
      <nav aria-label={texts.toc} className="hidden lg:block">
        <div className="sticky top-6 grid gap-2">
          <p className="text-overline text-fg-muted uppercase">{texts.toc}</p>
          <ol className="grid gap-0.5 border-l border-line">
            {TOC.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="-ml-px block border-l-2 border-transparent px-3 py-1 text-small text-fg-muted hover:border-line-strong hover:text-fg"
                >
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <div className="grid min-w-0 grid-cols-1 gap-10">
        <div className="grid gap-4">
          <PageHeader title={texts.title} description={texts.description} className="mb-0" />
          <Alert tone="info" title={texts.devOnly}>
            {texts.docsHint}
          </Alert>
        </div>

        <GuideSection id="principios" title={texts.sections.principles}>
          <ul className="grid gap-4 md:grid-cols-2">
            {texts.principles.map((principle) => (
              <li key={principle.title} className="grid gap-1 border-l-2 border-primary pl-4">
                <p className="text-label font-semibold text-fg">{principle.title}</p>
                <p className="text-body text-fg-muted">{principle.text}</p>
              </li>
            ))}
          </ul>
        </GuideSection>

        <ColorSection />
        <TypographySection />
        <FoundationsSection />
        <ButtonsSection />
        <FormsSection />
        <DataSection />
        <FeedbackSection />
        <OverlaysSection />
        <DomainSection />
        <IdentitySection />
        <CompareSection />
      </div>
    </div>
  );
}
