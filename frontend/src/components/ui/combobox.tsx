"use client";

import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useId, useMemo, useState, type FocusEventHandler } from "react";

import { TEXTS } from "@/constants/texts";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";

import { controlHeight, controlSurface } from "./control-styles";
import { useFieldControl } from "./field";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Texto secundario: clave de la materia, tipo de carrera… También se busca en él. */
  description?: string;
  /** Otros textos por los que se puede encontrar (siglas, claves). */
  keywords?: readonly string[];
  disabled?: boolean;
  /** Encabezado del grupo; las opciones se agrupan en el orden en que aparecen. */
  group?: string;
}

export interface ComboboxProps {
  options: readonly ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

function groupOptions(options: readonly ComboboxOption[]) {
  const groups = new Map<string, ComboboxOption[]>();
  for (const option of options) {
    const key = option.group ?? "";
    groups.set(key, [...(groups.get(key) ?? []), option]);
  }
  return [...groups.entries()];
}

/**
 * Selector con búsqueda para listas largas que el docente reconoce por nombre (materias,
 * carreras). La búsqueda ignora acentos, mayúsculas y el orden de las palabras: «bases
 * datos» encuentra «Bases de Datos». Nunca acepta texto libre: solo opciones existentes.
 */
export function Combobox({
  options,
  value,
  onChange,
  onBlur,
  placeholder = TEXTS.ui.combobox.placeholder,
  searchPlaceholder = TEXTS.ui.combobox.searchPlaceholder,
  emptyText = TEXTS.ui.combobox.empty,
  disabled,
  className,
  ...props
}: ComboboxProps) {
  const controlProps = useFieldControl(props);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = `opciones-${useId()}`;
  const selected = options.find((option) => option.value === value);

  const visible = useMemo(
    () =>
      options.filter((option) =>
        matchesSearch(query, option.label, option.description, ...(option.keywords ?? [])),
      ),
    [options, query],
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          disabled={disabled}
          onBlur={onBlur}
          data-slot="combobox-trigger"
          className={cn(
            controlSurface,
            controlHeight,
            "flex items-center justify-between gap-2 text-left",
            !selected && "text-fg-muted",
            className,
          )}
          {...controlProps}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent id={listId} className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <Command shouldFilter={false} loop label={placeholder}>
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder}
              className="h-(--control-height-md) w-full bg-transparent text-control text-fg outline-none placeholder:text-fg-muted sm:text-body"
            />
          </div>
          <Command.List className="max-h-72 overflow-y-auto p-1">
            {visible.length === 0 ? (
              <Command.Empty className="px-2 py-4 text-center text-small text-fg-muted">
                {emptyText}
              </Command.Empty>
            ) : null}
            {groupOptions(visible).map(([group, groupOptionsList]) => (
              <Command.Group
                key={group || "sin-grupo"}
                heading={group || undefined}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-overline [&_[cmdk-group-heading]]:text-fg-muted [&_[cmdk-group-heading]]:uppercase"
              >
                {groupOptionsList.map((option) => (
                  <Command.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    onSelect={() => {
                      onChange(option.value);
                      handleOpenChange(false);
                    }}
                    className={cn(
                      "flex min-h-(--control-height-sm) cursor-default items-start gap-2 rounded-sm px-2 py-1.5 text-body outline-none select-none",
                      "data-[selected=true]:bg-primary-soft",
                      "data-[disabled=true]:cursor-not-allowed data-[disabled=true]:text-fg-disabled",
                    )}
                  >
                    <Check
                      aria-hidden="true"
                      className={cn(
                        "mt-1 size-4 shrink-0 text-primary-ink",
                        option.value === value ? "visible" : "invisible",
                      )}
                    />
                    <span className="grid">
                      <span>{option.label}</span>
                      {option.description ? (
                        <span className="text-small text-fg-muted">{option.description}</span>
                      ) : null}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
