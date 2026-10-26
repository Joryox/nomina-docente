/**
 * Acceso a localStorage que nunca rompe la página: en ventanas privadas, con el
 * almacenamiento bloqueado o lleno, el navegador lanza excepciones al leer o escribir. Las
 * preferencias son una comodidad, así que ante cualquier error se usa el valor por defecto.
 */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Sin almacenamiento la preferencia dura lo que la pestaña; no es un error del usuario.
    }
  },
};
