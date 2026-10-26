"use client";

import { useRef } from "react";

import { StatusBadge } from "@/components/domain/status-badge";
import { DESIGN_GUIDE } from "@/constants/design-guide";
import { contrastRatio, formatContrast, parseOklch, WCAG_AA } from "@/lib/color-contrast";
import { cn } from "@/lib/utils";
import {
  CONTRAST_PAIRS,
  SEMANTIC_COLOR_GROUPS,
  SEMANTIC_COLORS,
  type ContrastPair,
} from "@/styles/token-catalog";

import { useCssVariables } from "../hooks/use-css-variables";
import { GuideSection, TokenName } from "./guide-section";

const texts = DESIGN_GUIDE;
const VARIABLES = SEMANTIC_COLORS.map((token) => `--${token}`);
const MODES = ["light", "dark"] as const;

function ratioFor(values: Readonly<Record<string, string>>, pair: ContrastPair): number | null {
  const foreground = parseOklch(values[`--${pair.foreground}`] ?? "");
  const background = parseOklch(values[`--${pair.background}`] ?? "");
  return foreground && background ? contrastRatio(foreground, background) : null;
}

function Swatches({ mode }: { mode: (typeof MODES)[number] }) {
  return (
    <div
      data-theme={mode}
      className="grid gap-5 rounded-lg border border-line bg-canvas p-5 text-fg"
    >
      <p className="text-label font-semibold">{texts.contrast[mode]}</p>
      {SEMANTIC_COLOR_GROUPS.map((group) => (
        <div key={group.id} className="grid gap-2">
          <p className="text-overline text-fg-muted uppercase">{texts.colorGroups[group.id]}</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {group.tokens.map((token) => (
              <li key={token} className="grid gap-1">
                <span
                  aria-hidden="true"
                  className="h-10 rounded-md border border-line"
                  style={{ background: `var(--${token})` }}
                />
                <TokenName>{token}</TokenName>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ColorSection() {
  const lightRef = useRef<HTMLDivElement>(null);
  const darkRef = useRef<HTMLDivElement>(null);
  const light = useCssVariables(VARIABLES, lightRef);
  const dark = useCssVariables(VARIABLES, darkRef);
  const byMode = { light, dark };

  return (
    <>
      <GuideSection id="color" title={texts.sections.colors}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div ref={lightRef} data-theme="light">
            <Swatches mode="light" />
          </div>
          <div ref={darkRef} data-theme="dark">
            <Swatches mode="dark" />
          </div>
        </div>
      </GuideSection>

      <GuideSection
        id="contraste"
        title={texts.sections.contrast}
        description={texts.contrast.description}
      >
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full border-collapse text-body">
            <thead className="bg-surface-sunken">
              <tr>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-overline text-fg-muted uppercase"
                >
                  {texts.contrast.pair}
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-overline text-fg-muted uppercase"
                >
                  {texts.contrast.kind}
                </th>
                {MODES.map((mode) => (
                  <th
                    key={mode}
                    scope="col"
                    className="px-3 py-2 text-right text-overline text-fg-muted uppercase"
                  >
                    {texts.contrast[mode]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CONTRAST_PAIRS.map((pair) => (
                <tr
                  key={`${pair.kind}-${pair.foreground}-${pair.background}`}
                  className="border-t border-line"
                >
                  <td className="px-3 py-2">
                    <TokenName>
                      {pair.foreground} / {pair.background}
                    </TokenName>
                  </td>
                  <td className="px-3 py-2 text-small text-fg-muted">
                    {texts.contrast.kinds[pair.kind]}
                  </td>
                  {MODES.map((mode) => {
                    const ratio = ratioFor(byMode[mode], pair);
                    const minimum = pair.kind === "text" ? WCAG_AA.text : WCAG_AA.nonText;
                    const passes = ratio !== null && ratio >= minimum;
                    return (
                      <td key={mode} className="px-3 py-2 text-right">
                        <span
                          data-theme={mode}
                          className="inline-flex items-center gap-2 rounded-sm bg-canvas px-2 py-0.5"
                        >
                          <span
                            aria-hidden="true"
                            className="px-1 text-label font-semibold"
                            style={{
                              color: `var(--${pair.foreground})`,
                              background: `var(--${pair.background})`,
                            }}
                          >
                            Aa
                          </span>
                          <span className={cn("text-small text-fg figures")}>
                            {ratio === null ? "—" : formatContrast(ratio)}
                          </span>
                          {ratio === null ? null : (
                            <StatusBadge
                              status={passes ? "active" : "warning"}
                              label={passes ? texts.contrast.passes : texts.contrast.fails}
                            />
                          )}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GuideSection>
    </>
  );
}
