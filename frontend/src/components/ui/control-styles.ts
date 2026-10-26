/**
 * Clases compartidas por los controles de captura (Input, Textarea, Select, Combobox,
 * selector de fecha y de hora), para que todos midan, se enfoquen y muestren error igual.
 * En celular el texto es de 16 px (`text-control`) para que iOS no haga zoom.
 */
export const controlSurface = [
  "w-full min-w-0 rounded-md border border-line-strong bg-surface text-control text-fg sm:text-body",
  "transition-colors duration-(--duration-fast) ease-standard",
  "placeholder:text-fg-muted hover:border-fg-muted",
  "disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-sunken disabled:text-fg-disabled",
  "aria-invalid:border-danger-ink aria-invalid:hover:border-danger-ink",
  "data-[invalid=true]:border-danger-ink",
].join(" ");

export const controlHeight = "h-(--control-height-md) px-3";
