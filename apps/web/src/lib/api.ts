const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || "lexhelm-dev-token-2024";

// JWT bearer token — set by AuthProvider
let _bearerToken: string | null = null;
export function setAuthToken(token: string | null) {
  _bearerToken = token;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "X-API-TOKEN": API_TOKEN,
    ...(init?.headers as Record<string, string>),
  };
  if (_bearerToken) {
    headers["Authorization"] = `Bearer ${_bearerToken}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ---------- Auth ----------
export interface AuthGoogleResponse {
  token: string;
  user: { id: string; email: string; name: string; picture?: string };
  org: { id: string; name: string };
}

/** Send Google ID token to backend, get back a signed app JWT. */
export const loginWithGoogleBackend = (credential: string) =>
  fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `Auth error ${res.status}`);
    }
    return res.json() as Promise<AuthGoogleResponse>;
  });

// ---------- Health ----------
export const healthCheck = () => apiFetch<{ status: string }>("/healthz");

// ---------- Search ----------
export interface SearchResult {
  title: string;
  doc_id: string;
  headline?: string;
  court?: string;
  date?: string;
  citation?: string;
  url?: string;
}
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  page_size: number;
}
export const searchCases = (query: string, page = 1, pageSize = 10) =>
  apiFetch<SearchResponse>(`/search?query=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`);

// ---------- Documents ----------
export interface Template {
  template_id: string;
  name: string;
  description: string;
  required_fields: string[];
  optional_fields: string[];
}
export const listTemplates = () => apiFetch<{ templates: Template[] }>("/documents/templates");

export interface GenerateRequest {
  template_id: string;
  params: Record<string, string>;
  format?: string;
  ai_enhance?: boolean;
}
export interface GenerateResponse {
  content: string;
  template_id: string;
  format: string;
  suggestions?: string[];
}
export const generateDocument = (req: GenerateRequest) =>
  apiFetch<GenerateResponse>("/documents/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

export interface DraftRequest {
  description: string;
  ai_enhance?: boolean;
}
export interface DraftResponse {
  template_id: string | null;
  content: string;
  params: Record<string, string>;
  suggestions: string[];
  format: string;
}
export const draftFromDescription = (req: DraftRequest) =>
  apiFetch<DraftResponse>("/documents/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

export const parseContract = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<{ analysis: Record<string, unknown> }>("/documents/parse", {
    method: "POST",
    body: form,
  });
};

// ---------- Doc Chat ----------
export interface DocSession {
  id: string;
  file_name: string;
  content_type: string | null;
  byte_size: number | null;
  status: string;
  analysis: Record<string, unknown> | null;
  error: string | null;
  message_count: number;
  created_at: string;
}
export interface DocMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}
export interface DocSessionDetail extends DocSession {
  messages: DocMessage[];
}
export const uploadDocument = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<DocSession>("/doc-chat/upload", { method: "POST", body: form });
};
export const getDocSession = (id: string) => apiFetch<DocSessionDetail>(`/doc-chat/${id}`);
export const listDocSessions = (limit = 20) => apiFetch<{ sessions: DocSession[] }>(`/doc-chat?limit=${limit}`);
export const chatWithDoc = (sessionId: string, message: string) =>
  apiFetch<{ session_id: string; user_message: string; assistant_message: string }>(
    `/doc-chat/${sessionId}/chat`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) },
  );

// ---------- Draft Chat (conversational drafting) ----------
export interface DraftChatResponse {
  session_id: string;
  assistant_message: string;
  phase: string;
  template_id: string | null;
  collected_fields: Record<string, string>;
  missing_fields: string[];
  generated_content: string | null;
}
export interface DraftChatMessage {
  id: string;
  role: string;
  content: string;
  extracted_fields: Record<string, string> | null;
  created_at: string;
}
export interface DraftChatSessionDetail {
  session_id: string;
  phase: string;
  template_id: string | null;
  collected_fields: Record<string, string>;
  missing_fields: string[];
  generated_content: string | null;
  status: string;
  messages: DraftChatMessage[];
  created_at: string;
}
export interface DraftChatSessionSummary {
  session_id: string;
  template_id: string | null;
  phase: string;
  status: string;
  message_count: number;
  created_at: string;
}
export const startDraftChat = (message: string, templateId?: string) =>
  apiFetch<DraftChatResponse>("/draft-chat/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, template_id: templateId }),
  });
export const sendDraftMessage = (sessionId: string, message: string) =>
  apiFetch<DraftChatResponse>(`/draft-chat/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
export const confirmDraftChat = (sessionId: string) =>
  apiFetch<DraftChatResponse>(`/draft-chat/${sessionId}/confirm`, { method: "POST" });
export const getDraftChatSession = (id: string) =>
  apiFetch<DraftChatSessionDetail>(`/draft-chat/${id}`);
export const listDraftChatSessions = (limit = 20) =>
  apiFetch<{ sessions: DraftChatSessionSummary[] }>(`/draft-chat?limit=${limit}`);

// ---------- Jobs ----------
export interface Job {
  id: string;
  job_type: string;
  status: string;
  input_params: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  progress: number | null;
  created_at: string;
  completed_at: string | null;
}
export const submitJob = (jobType: string, params: Record<string, unknown>) =>
  apiFetch<Job>("/jobs/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_type: jobType, params }),
  });
export const getJob = (id: string) => apiFetch<Job>(`/jobs/${id}`);
export const listJobs = (limit = 20) => apiFetch<{ jobs: Job[] }>(`/jobs?limit=${limit}`);

// ---------- Matters ----------
export interface Matter {
  id: string;
  org_id: string;
  title: string;
  case_type: string | null;
  status: string;
  description: string | null;
  client_name: string | null;
  opposing_party: string | null;
  court: string | null;
  filing_date: string | null;
  next_hearing: string | null;
  created_at: string;
  updated_at: string;
}
export const listMatters = (orgId: string) => apiFetch<Matter[]>(`/matters?org_id=${orgId}`);

// ---------- Orgs ----------
export interface Org {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}
export const listOrgs = () => apiFetch<Org[]>("/orgs");

// ---------- Beta Access ----------
export interface BetaRequestData {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  use_case: string | null;
  referrer: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface BetaStatusResponse {
  email: string;
  status: string;
}
export interface MetricsSummary {
  total_users: number;
  total_beta_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  total_api_requests: number;
  recent_signups: BetaRequestData[];
}

// Public — no auth required
export const submitBetaRequest = (data: {
  email: string;
  name?: string;
  company?: string;
  use_case?: string;
  referrer?: string;
}) =>
  apiFetch<BetaRequestData>("/beta/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const checkBetaStatus = (email: string) =>
  apiFetch<BetaStatusResponse>(`/beta/status?email=${encodeURIComponent(email)}`);

export const trackEvent = (eventType: string, metadata?: Record<string, unknown>) =>
  fetch(`${API_BASE}/beta/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-TOKEN": API_TOKEN },
    body: JSON.stringify({ event_type: eventType, metadata }),
  }).catch(() => {}); // fire-and-forget

// Admin — auth required
export const listBetaRequests = (statusFilter?: string, limit = 50, offset = 0) => {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (statusFilter) params.set("status", statusFilter);
  return apiFetch<BetaRequestData[]>(`/beta/admin/requests?${params}`);
};

export const reviewBetaRequest = (requestId: string, status: "approved" | "rejected") =>
  apiFetch<BetaRequestData>(`/beta/admin/requests/${requestId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

export const getAdminMetrics = () => apiFetch<MetricsSummary>("/beta/admin/metrics");
