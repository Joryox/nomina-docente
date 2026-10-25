/** Error general del formulario (el que no corresponde a un campo concreto). */
export function FormAlert({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
