import { apiRequest } from "@/services/apiService";
import { toast } from "sonner";

/**
 * Reads the auth token that the backend expects inside request payloads.
 *
 * The app stores the logged-in user as base64(JSON) under localStorage "user"
 * (see Auth/mutation.tsx). Every backend route authenticates via `payload.token`,
 * so this is the single source of truth for that value.
 */
export function getAuthToken(): string {
  const userStr = localStorage.getItem("user");
  if (!userStr) return "";
  try {
    const userData = JSON.parse(atob(userStr));
    return userData?.token || "";
  } catch {
    return "";
  }
}

export type ApiEnvelope<T> = {
  header: { code: number; message: string };
  response: T;
};

/**
 * POST a payload to the API and return the inner `response` payload.
 *
 * The backend always answers with HTTP 200 and an envelope
 * `{ header: { code, message }, response }`, so non-success states (404/400/401)
 * are encoded in `header.code` rather than the HTTP status. `apiRequest` wraps
 * the axios body as `{ response: <envelope> }` on success, or resolves to
 * `undefined` when its interceptor swallowed a transport error.
 *
 * This helper normalises both cases: it throws on any non-200 envelope code (so
 * react-query surfaces an error state) and surfaces a toast for the user. On a
 * 401 it clears the session and redirects to the login screen.
 */
export async function postApi<T>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await apiRequest("post", url, body);

  if (!res || !res.response) {
    throw new Error("Network error. Please check your connection and try again.");
  }

  const envelope = res.response as ApiEnvelope<T>;
  const code = envelope?.header?.code;
  const message = envelope?.header?.message;

  if (code && code !== 200) {
    if (code === 401) {
      toast.error("Session expired. Please log in again.");
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    } else {
      toast.error(message || "Something went wrong. Please try again.");
    }
    throw new Error(message || `Request failed with code ${code}`);
  }

  return envelope.response;
}
