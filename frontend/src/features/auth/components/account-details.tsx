import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TEXTS } from "@/constants/texts";
import { formatDateTime } from "@/lib/formatters";

import type { Me } from "../types/auth";

const texts = TEXTS.profile.account;

/** Datos de la cuenta que no se editan: último inicio de sesión y alta. */
export function AccountDetails({ me }: { me: Me }) {
  const rows = [
    {
      label: texts.lastLogin,
      value: me.account.last_login_at ? formatDateTime(me.account.last_login_at) : texts.never,
    },
    { label: texts.createdAt, value: formatDateTime(me.account.created_at) },
  ];
  return (
    <Card aria-labelledby="perfil-cuenta">
      <CardHeader>
        <CardTitle id="perfil-cuenta">{texts.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-body">
          {rows.map((row, index) => (
            <div
              key={row.label}
              className={index > 0 ? "grid gap-0.5 border-t border-line pt-3" : "grid gap-0.5"}
            >
              <dt className="text-small text-fg-muted">{row.label}</dt>
              <dd className="font-medium break-words text-fg">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
