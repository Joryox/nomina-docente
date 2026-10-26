"use client";

import { Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DESIGN_GUIDE } from "@/constants/design-guide";
import { cn } from "@/lib/utils";

import { useCssVariables } from "../hooks/use-css-variables";
import { GuideExample, GuideSection, TokenName } from "./guide-section";

const texts = DESIGN_GUIDE;

const TYPE_SCALE = [
  { name: "display", className: "font-serif text-display" },
  { name: "title", className: "font-serif text-title" },
  { name: "subtitle", className: "text-subtitle" },
  { name: "body", className: "text-body" },
  { name: "label", className: "text-label" },
  { name: "small", className: "text-small" },
  { name: "overline", className: "text-overline uppercase" },
  { name: "figure", className: "text-figure figures" },
] as const;

const TYPE_VARIABLES = TYPE_SCALE.flatMap(({ name }) => [
  `--type-${name}-size`,
  `--type-${name}-leading`,
  `--type-${name}-weight`,
]);

const SPACING = ["--page-gutter", "--page-block", "--section-gap", "--field-gap"] as const;
const CONTROLS = ["--control-height-sm", "--control-height-md", "--control-height-lg"] as const;
const RADII = [
  { name: "--corner-xs", className: "rounded-xs" },
  { name: "--corner-sm", className: "rounded-sm" },
  { name: "--corner-md", className: "rounded-md" },
  { name: "--corner-lg", className: "rounded-lg" },
] as const;
const SHADOWS = [
  { name: "--elevation-xs", className: "shadow-xs" },
  { name: "--elevation-sm", className: "shadow-sm" },
  { name: "--elevation-md", className: "shadow-md" },
] as const;
const LAYERS = [
  "--layer-sticky",
  "--layer-sidebar",
  "--layer-overlay",
  "--layer-modal",
  "--layer-popover",
  "--layer-toast",
  "--layer-tooltip",
  "--layer-skip-link",
] as const;
const MOTION = [
  { duration: "--duration-fast", easing: "--easing-standard" },
  { duration: "--duration-base", easing: "--easing-standard" },
  { duration: "--duration-slow", easing: "--easing-enter" },
  { duration: "--duration-emphasis", easing: "--easing-exit" },
] as const;

const FOUNDATION_VARIABLES = [
  ...SPACING,
  ...CONTROLS,
  ...RADII.map((radius) => radius.name),
  ...LAYERS,
  ...MOTION.flatMap((item) => [item.duration, item.easing]),
];

export function TypographySection() {
  const values = useCssVariables(TYPE_VARIABLES);
  return (
    <GuideSection id="tipografia" title={texts.sections.typography}>
      <GuideExample title={texts.typography.families} className="grid">
        <p className="text-body">{texts.typography.sans}</p>
        <p className="font-serif text-subtitle">{texts.typography.serif}</p>
        <p className="font-mono text-body">{texts.typography.mono} · NOM-202610-Q2-000042</p>
      </GuideExample>
      <div className="grid divide-y divide-line rounded-lg border border-line bg-surface">
        {TYPE_SCALE.map(({ name, className }) => (
          <div
            key={name}
            className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] md:items-baseline"
          >
            <div className="grid">
              <TokenName>text-{name}</TokenName>
              <span className="text-small text-fg-muted figures">
                {values[`--type-${name}-size`]} / {values[`--type-${name}-leading`]} ·{" "}
                {values[`--type-${name}-weight`]}
              </span>
            </div>
            <p className={cn("min-w-0 text-fg", className)}>
              {name === "body" || name === "small"
                ? texts.typography.bodySample
                : name === "figure"
                  ? "$5,221.67"
                  : texts.typography.sample}
            </p>
          </div>
        ))}
      </div>
      <GuideExample title={texts.typography.tabular} className="grid">
        <p className="text-subtitle figures">{texts.typography.figuresSample}</p>
        <p className="text-small text-fg-muted">{texts.typography.proportional}</p>
        <p className="text-subtitle proportional-nums">{texts.typography.figuresSample}</p>
      </GuideExample>
    </GuideSection>
  );
}

export function FoundationsSection() {
  const values = useCssVariables(FOUNDATION_VARIABLES);
  const [playing, setPlaying] = useState(false);

  return (
    <>
      <GuideSection id="fundamentos" title={texts.sections.foundations}>
        <div className="grid gap-4 lg:grid-cols-2">
          <GuideExample title={texts.foundations.spacing} className="grid">
            {SPACING.map((name) => (
              <div
                key={name}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-center gap-3"
              >
                <TokenName>{name}</TokenName>
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-3 bg-primary-soft-hover"
                    style={{ width: `var(${name})` }}
                  />
                  <span className="text-small text-fg-muted figures">{values[name]}</span>
                </span>
              </div>
            ))}
          </GuideExample>
          <GuideExample title={texts.foundations.controls} className="items-end">
            {CONTROLS.map((name) => (
              <div key={name} className="grid justify-items-start gap-1">
                <span
                  aria-hidden="true"
                  className="w-16 rounded-md border border-line-strong bg-surface"
                  style={{ height: `var(${name})` }}
                />
                <TokenName>{name.replace("--control-height-", "")}</TokenName>
                <span className="text-small text-fg-muted figures">{values[name]}</span>
              </div>
            ))}
          </GuideExample>
          <GuideExample title={texts.foundations.radii}>
            {RADII.map(({ name, className }) => (
              <div key={name} className="grid justify-items-start gap-1">
                <span
                  aria-hidden="true"
                  className={cn("size-14 border-2 border-primary bg-primary-soft", className)}
                />
                <TokenName>{className}</TokenName>
                <span className="text-small text-fg-muted figures">{values[name]}</span>
              </div>
            ))}
          </GuideExample>
          <GuideExample title={texts.foundations.shadows} className="bg-canvas">
            {SHADOWS.map(({ name, className }) => (
              <div
                key={name}
                className={cn(
                  "grid h-20 w-28 place-items-center rounded-md bg-surface-raised",
                  className,
                )}
              >
                <TokenName>{className}</TokenName>
              </div>
            ))}
          </GuideExample>
          <GuideExample
            title={texts.foundations.layers}
            className="grid sm:grid-cols-4 lg:col-span-2"
          >
            {LAYERS.map((name) => (
              <div
                key={name}
                className="flex items-center justify-between gap-2 rounded-sm bg-surface-sunken px-2 py-1"
              >
                <TokenName>{name.replace("--layer-", "")}</TokenName>
                <span className="text-small font-semibold text-fg figures">{values[name]}</span>
              </div>
            ))}
          </GuideExample>
        </div>
      </GuideSection>

      <GuideSection
        id="movimiento"
        title={texts.sections.motion}
        description={texts.motion.description}
      >
        <GuideExample title={texts.sections.motion} className="grid">
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => setPlaying((value) => !value)}
          >
            <Play aria-hidden="true" />
            {texts.motion.play}
          </Button>
          {MOTION.map(({ duration, easing }) => (
            <div key={duration} className="grid gap-1">
              <span className="text-small text-fg-muted figures">
                <TokenName>{duration}</TokenName> {values[duration]} ·{" "}
                <TokenName>{easing}</TokenName>
              </span>
              <div className="relative h-2 rounded-full bg-surface-sunken">
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-0 left-0 w-1/4 rounded-full bg-primary transition-[left]",
                    playing && "left-3/4",
                  )}
                  style={{
                    transitionDuration: `var(${duration})`,
                    transitionTimingFunction: `var(${easing})`,
                  }}
                />
              </div>
            </div>
          ))}
        </GuideExample>
      </GuideSection>
    </>
  );
}
