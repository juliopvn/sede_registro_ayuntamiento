export interface AdjuntoSubido {
  key: string;
  nombreOriginal: string;
  tipo: string;
  tamano: number;
}

/**
 * Sube un fichero directamente a S3 mediante una URL prefirmada (PUT),
 * reportando progreso. El servidor nunca ve los bytes del fichero.
 */
export async function subirAdjunto(
  archivo: File,
  borradorId: string,
  onProgreso: (porcentaje: number) => void,
): Promise<AdjuntoSubido> {
  const presignResponse = await fetch("/api/registros/adjuntos/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      borradorId,
      nombreOriginal: archivo.name,
      tipo: archivo.type || "application/octet-stream",
      tamano: archivo.size,
    }),
  });

  if (!presignResponse.ok) {
    const data = (await presignResponse.json()) as { error?: string };
    throw new Error(data.error ?? "No se ha podido preparar la subida del fichero.");
  }

  const { key, uploadUrl } = (await presignResponse.json()) as { key: string; uploadUrl: string };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", archivo.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgreso(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Fallo al subir el fichero (HTTP ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Error de red al subir el fichero."));
    xhr.send(archivo);
  });

  return {
    key,
    nombreOriginal: archivo.name,
    tipo: archivo.type || "application/octet-stream",
    tamano: archivo.size,
  };
}
