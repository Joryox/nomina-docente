"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { TEXTS } from "@/constants/texts";
import { toUserMessage } from "@/lib/api-error";

import { useLogoutAll } from "../hooks/use-auth-mutations";

const texts = TEXTS.profile.sessions;

/** Cierra todas las sesiones de la cuenta, incluida la actual, previa confirmación. */
export function LogoutEverywhere() {
  const logoutAll = useLogoutAll();

  const confirm = async () => {
    try {
      await logoutAll.mutateAsync();
      toast.info(texts.done);
    } catch (error) {
      toast.error(toUserMessage(error));
      throw error;
    }
  };

  return (
    <Card aria-labelledby="perfil-sesiones">
      <CardHeader>
        <div>
          <CardTitle id="perfil-sesiones">{texts.title}</CardTitle>
          <CardDescription>{texts.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ConfirmDialog
          trigger={
            <Button
              variant="outline"
              className="h-auto min-h-(--control-height-md) w-full py-2 whitespace-normal"
            >
              <LogOut aria-hidden="true" />
              {texts.action}
            </Button>
          }
          title={texts.confirmTitle}
          description={texts.confirmDescription}
          consequences={texts.confirmConsequences}
          confirmLabel={texts.confirmLabel}
          irreversible={false}
          onConfirm={confirm}
        />
      </CardContent>
    </Card>
  );
}
