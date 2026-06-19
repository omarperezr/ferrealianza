import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-745f9946`;

interface ApiOptions extends Omit<RequestInit, 'headers'> {
  accessToken?: string | null;
  headers?: Record<string, string>;
}

/**
 * Centralized fetch helper for the Supabase Edge Function.
 *
 * It parses responses safely so that a non-JSON body (for example an outdated
 * Edge Function answering with the plain text "404 Not Found") produces a clear,
 * actionable error instead of the cryptic
 * "JSON.parse: unexpected non-whitespace character after JSON data".
 */
export async function apiFetch(endpoint: string, options: ApiOptions = {}) {
  const { accessToken, headers: customHeaders, body, ...rest } = options;

  const headers: Record<string, string> = { ...customHeaders };

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  // Always send a bearer token: the user's token when available, otherwise the
  // public anon key (required by Supabase Edge Functions for public routes).
  headers['Authorization'] = `Bearer ${accessToken || publicAnonKey}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, { ...rest, headers, body });
  } catch (e) {
    // The request never reached the server (offline / network error). Mark it
    // as transient so callers (e.g. the sync queue) can retry it later instead
    // of discarding the operation.
    const err = new Error('Sin conexión con el servidor') as Error & { network?: boolean };
    err.network = true;
    throw err;
  }

  const rawBody = await response.text();
  let data: any = {};

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      // The body was not valid JSON.
      if (response.status === 404) {
        throw new Error(
          'El servidor no reconoce esta operación. Vuelve a desplegar la función Edge de Supabase para habilitar las funciones más recientes.',
        );
      }
      throw new Error(
        `El servidor respondió de forma inesperada (código ${response.status}). Inténtalo de nuevo.`,
      );
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Error del servidor (${response.status})`);
  }

  return data;
}
