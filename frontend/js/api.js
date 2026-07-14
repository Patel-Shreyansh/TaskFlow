/**
 * Small fetch wrapper shared by every page. Centralizes the API base
 * URL, attaches the JWT, and redirects to the login page whenever the
 * server says the session is invalid or expired.
 */
const API_BASE_URL = window.location.hostname
  ? `http://${window.location.hostname}:5001/api`
  : "http://localhost:5001/api";

const TokenStore = {
  get() {
    return localStorage.getItem("taskflow_token");
  },
  set(token) {
    localStorage.setItem("taskflow_token", token);
  },
  clear() {
    localStorage.removeItem("taskflow_token");
    localStorage.removeItem("taskflow_user");
  },
  getUser() {
    const raw = localStorage.getItem("taskflow_user");
    return raw ? JSON.parse(raw) : null;
  },
  setUser(user) {
    localStorage.setItem("taskflow_user", JSON.stringify(user));
  },
};

async function apiRequest(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = TokenStore.get();
    if (!token) {
      window.location.href = "login.html";
      throw new Error("Not authenticated");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error("Could not reach the server. Is the backend running?");
  }

  let data = {};
  try {
    data = await response.json();
  } catch (parseErr) {
    // No JSON body (e.g. some 204s) - that's fine.
  }

  if (response.status === 401 && auth) {
    TokenStore.clear();
    window.location.href = "login.html";
    throw new Error(data.error || "Session expired");
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

const Api = {
  register: (payload) => apiRequest("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => apiRequest("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => apiRequest("/auth/me"),

  getTasks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/tasks${query ? `?${query}` : ""}`);
  },
  getTaskStats: () => apiRequest("/tasks/stats"),
  createTask: (payload) => apiRequest("/tasks", { method: "POST", body: payload }),
  updateTask: (id, payload) => apiRequest(`/tasks/${id}`, { method: "PUT", body: payload }),
  deleteTask: (id) => apiRequest(`/tasks/${id}`, { method: "DELETE" }),

  getMembers: () => apiRequest("/members"),
  createMember: (payload) => apiRequest("/members", { method: "POST", body: payload }),
  deleteMember: (id) => apiRequest(`/members/${id}`, { method: "DELETE" }),

  getTeams: () => apiRequest("/teams"),
  createTeam: (payload) => apiRequest("/teams", { method: "POST", body: payload }),
  deleteTeam: (id) => apiRequest(`/teams/${id}`, { method: "DELETE" }),
};
