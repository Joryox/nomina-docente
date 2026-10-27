/** Entrega al navegador un archivo descargado con `apiClient.download` para guardarlo. */
export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // El navegador ya tomó el archivo; liberar la URL en el siguiente ciclo es seguro.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
