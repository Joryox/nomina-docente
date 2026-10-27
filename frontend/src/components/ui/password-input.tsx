"use client";

import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { useId, useState, type ComponentProps, type KeyboardEvent } from "react";

import { TEXTS } from "@/constants/texts";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Input } from "./input";

const texts = TEXTS.ui.password;

type PasswordInputProps = Omit<ComponentProps<"input">, "type">;

/**
 * Campo de contraseña con botón para mostrarla u ocultarla y aviso cuando Bloq Mayús está
 * activado (la causa más común de una contraseña «incorrecta»). Va dentro de un Field.
 */
export function PasswordInput({
  className,
  onKeyDown,
  onKeyUp,
  onBlur,
  "aria-describedby": describedBy,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const capsLockId = `bloq-mayus-${useId()}`;

  const readCapsLock = (event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(event.getModifierState("CapsLock"));
  };

  return (
    <div className="grid gap-1.5">
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={cn("pr-11", className)}
          aria-describedby={
            [describedBy, capsLock ? capsLockId : null].filter(Boolean).join(" ") || undefined
          }
          onKeyDown={(event) => {
            readCapsLock(event);
            onKeyDown?.(event);
          }}
          onKeyUp={(event) => {
            readCapsLock(event);
            onKeyUp?.(event);
          }}
          onBlur={(event) => {
            setCapsLock(false);
            onBlur?.(event);
          }}
          {...props}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-1 -translate-y-1/2 text-fg-muted"
          aria-label={visible ? texts.hide : texts.show}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      </div>
      {capsLock ? (
        <p
          id={capsLockId}
          role="status"
          className="flex items-center gap-1.5 text-small text-warning-ink"
        >
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          {texts.capsLock}
        </p>
      ) : null}
    </div>
  );
}
