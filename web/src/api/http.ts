export type Errores = Record<string, string>;

export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errores: Errores = {},
  ) {
    super(message);
  }
}

export async function pedir<T>(metodo: "GET" | "POST" | "PUT" | "DELETE", ruta: string, cuerpo?: unknown): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: cuerpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      credentials: "same-origin",
    });
  } catch {
    throw new ErrorApi(0, "No hay conexión con el servidor. Revise su conexión e intente de nuevo.");
  }
  const datos = respuesta.status === 204 ? {} : await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, datos.error ?? "No se pudo completar la operación.", datos.errores ?? {});
  }
  return datos as T;
}
