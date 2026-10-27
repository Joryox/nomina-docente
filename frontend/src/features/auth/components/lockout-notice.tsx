"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { TEXTS } from "@/constants/texts";

const texts = TEXTS.auth.login;
const TICK_MS = 1000;
const SECONDS_PER_MINUTE = 60;

function remainingText(seconds: number): string {
  if (seconds < SECONDS_PER_MINUTE) {
    return texts.remainingUnderMinute;
  }
  return texts.remainingMinutes(Math.ceil(seconds / SECONDS_PER_MINUTE));
}

/**
 * Aviso de cuenta bloqueada con el tiempo que falta. El texto solo cambia cuando cambia el
 * minuto, así que un lector de pantalla no lo repite a cada segundo.
 */
export function LockoutNotice({ seconds }: { seconds: number }) {
  const [deadline] = useState(() => Date.now() + seconds * TICK_MS);
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / TICK_MS));
      setLeft(next);
      if (next === 0) {
        window.clearInterval(timer);
      }
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [deadline]);

  if (left === 0) {
    return (
      <Alert tone="info" announce>
        {texts.lockedOver}
      </Alert>
    );
  }
  return (
    <Alert tone="warning" title={texts.lockedTitle} announce>
      {texts.lockedBody(remainingText(left))}
    </Alert>
  );
}
