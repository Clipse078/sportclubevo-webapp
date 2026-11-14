export type ClubDevelopmentFetchFailure = {
  ok: false;
  status: number | null;
  message: string;
};

export type ClubDevelopmentFetchSuccess<T> = {
  ok: true;
  status: number;
  data: T;
};

export type ClubDevelopmentFetchResult<T> =
  | ClubDevelopmentFetchSuccess<T>
  | ClubDevelopmentFetchFailure;

function messageForHttpStatus(status: number, bodyError?: string | null): string {
  if (status === 401) {
    return "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.";
  }
  if (status === 403) {
    return "Du hast keine Berechtigung für diese Aktion.";
  }
  if (status === 404) {
    return "Die angeforderte Ressource wurde nicht gefunden.";
  }
  if (status >= 500) {
    return bodyError?.trim() || "Der Server konnte die Anfrage nicht verarbeiten.";
  }
  return bodyError?.trim() || "Die Anfrage ist fehlgeschlagen.";
}

export async function clubDevelopmentFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ClubDevelopmentFetchResult<T>> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    if (!isJson) {
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          message: messageForHttpStatus(res.status),
        };
      }
      return {
        ok: false,
        status: res.status,
        message: "Unerwartete Serverantwort.",
      };
    }

    const data = (await res.json().catch(() => null)) as T & { error?: string };
    if (!res.ok) {
      const bodyError = typeof data?.error === "string" ? data.error : null;
      return {
        ok: false,
        status: res.status,
        message: messageForHttpStatus(res.status, bodyError),
      };
    }

    return { ok: true, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: null,
      message: "Verbindungsfehler. Bitte erneut versuchen.",
    };
  }
}