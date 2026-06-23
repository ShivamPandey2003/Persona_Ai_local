import { http, HttpResponse } from "msw";
import { makeProject } from "../factories";

/**
 * Default "happy path" MSW handlers.
 *
 * The backend always answers HTTP 200 and encodes the real status inside an
 * envelope: `{ header: { code, message }, response }`. These defaults return
 * success envelopes; individual tests override a handler with `server.use(...)`
 * to simulate errors (401/500/network) without touching the others.
 */

// Must match VITE_REACT_APP_API_URL in vitest.config.ts.
export const API_URL = "http://localhost/api/";
const url = (path: string) => `${API_URL}${path}`;

/** Wrap a payload in the standard success envelope. */
export function ok<T>(response: T, message = "Success") {
  return HttpResponse.json({ header: { code: 200, message }, response });
}

/** Build an error envelope (still HTTP 200, error lives in header.code). */
export function envelopeError(code: number, message: string) {
  return HttpResponse.json({ header: { code, message }, response: null });
}

export const handlers = [
  http.post(url("users/login"), () =>
    ok({ token: "test-token", firstName: "Test", lastName: "User" }),
  ),

  http.post(url("users/logout"), () => ok({ message: "Logged out" })),

  http.post(url("projects/list"), () =>
    ok({
      projects: [makeProject(), makeProject({ project_id: "p2", project_name: "Second" })],
      pagination: { total: 2, offset: 0, limit: 10 },
    }),
  ),

  http.post(url("projects/get"), () => ok(makeProject())),
];
