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

/**
 * The data-source picker's options as the backend reports them for a project
 * with no processed data of its own: master builds, the uploaded ones do not.
 *
 * Exported so a test can spread it and flip one row (see `dataSourceOptions`).
 */
export const DATA_SOURCE_OPTIONS = [
  {
    key: "master",
    label: "Master data",
    description: "Build from the shared research database only.",
    available: true,
  },
  {
    key: "uploaded",
    label: "My uploaded data",
    description: "Build only from the data files uploaded to this project.",
    available: false,
    reason: "no_processed_data",
    reason_message: "This project has no processed data files yet.",
  },
  {
    key: "combined",
    label: "Master + my uploaded data",
    description:
      "Build from the shared research database and this project's uploaded data together.",
    available: false,
    reason: "no_processed_data",
    reason_message: "This project has no processed data files yet.",
  },
];

/** The options payload, optionally with every row marked available. */
export function dataSourceOptions({ allAvailable = false } = {}) {
  return {
    project_id: "p1",
    default: "master",
    options: DATA_SOURCE_OPTIONS.map((o) =>
      allAvailable
        ? { key: o.key, label: o.label, description: o.description, available: true }
        : o,
    ),
  };
}

/**
 * POST /projects/data-state — where a project stands in the setup step.
 *
 * Defaults to "already in use" (upload step closed, nothing running), which is
 * what every test that is not about the setup step wants.
 */
export function dataStateResponse(
  over: Partial<{
    project_id: string;
    upload_allowed: boolean;
    locked_reason: string | null;
    active_job: Record<string, unknown> | null;
    last_failed_job: Record<string, unknown> | null;
    counts: { processed_files: number; personas: number };
  }> = {},
) {
  return {
    project_id: "p1",
    upload_allowed: false,
    locked_reason: "chat_started",
    active_job: null,
    last_failed_job: null,
    counts: { processed_files: 1, personas: 0 },
    ...over,
  };
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

  // Default: a project already in use, so the chat entry does not divert to the
  // upload step. Tests that exercise the setup step override this.
  http.post(url("projects/data-state"), () => ok(dataStateResponse())),

  // Rendered by the builder-chat entry screen and the chat toolbar, so it is a
  // default rather than something every chat test has to re-declare.
  http.post(url("persona/chat/data-sources"), () => ok(dataSourceOptions())),
];
