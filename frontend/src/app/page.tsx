import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/constants/routes";

/**
 * La raíz no tiene contenido propio: el proxy la envía al panel o a iniciar sesión según haya
 * sesión. Si el proxy no corriera, el panel hace la misma comprobación.
 */
export default function HomePage() {
  redirect(APP_ROUTES.panel);
}
