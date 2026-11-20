/**
 * Central API configuration and fetch wrapper.
 * Load this before auth.js or dashboard.js on each page.
 */
const DEFAULT_API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "https://skillforge-8nnp.onrender.com/api";

const API_BASE_URL = (window.SF_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
const AUTH_RETURN_TO_KEY = "sf_auth_return_to";
const AUTH_RETURN_PAGES = new Set(["skill-gap.html", "roadmap.html"]);
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const Token = {
  get: () => {
    const token = localStorage.getItem("sf_token");
    if (token && !JWT_SHAPE.test(token)) {
      localStorage.removeItem("sf_token");
      localStorage.removeItem("sf_user");
      return null;
    }
    return token;
  },
  set: (token) => localStorage.setItem("sf_token", token),
  clear: () => localStorage.removeItem("sf_token"),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem("sf_user") || "null");
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem("sf_user", JSON.stringify(user)),
  clearUser: () => localStorage.removeItem("sf_user"),
};

function requireAuth() {
  if (!Token.get()) {
    redirectToLogin(getCurrentPageReturnTo(), "login-required");
    return false;
  }
  return true;
}

function sanitizeReturnTo(value) {
  const fallback = new URL("skill-gap.html", window.location.href);
  if (!value) return `${fallback.pathname}${fallback.search}${fallback.hash}`;

  try {
    const target = new URL(value, window.location.href);
    const isAllowedPage = Array.from(AUTH_RETURN_PAGES).some(
      (page) => target.pathname === new URL(page, window.location.href).pathname
    );
    if (target.origin !== window.location.origin || !isAllowedPage) {
      return `${fallback.pathname}${fallback.search}${fallback.hash}`;
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return `${fallback.pathname}${fallback.search}${fallback.hash}`;
  }
}

function getCurrentPageReturnTo() {
  return sanitizeReturnTo(
    `${window.location.pathname}${window.location.search}${window.location.hash}`
  );
}

function getAuthReturnTo() {
  const params = new URLSearchParams(window.location.search);
  return sanitizeReturnTo(params.get("returnTo") || getPendingAuthReturnTo());
}

function getPendingAuthReturnTo() {
  let storedReturnTo = null;
  try {
    storedReturnTo = sessionStorage.getItem(AUTH_RETURN_TO_KEY);
  } catch {
    return null;
  }
  return storedReturnTo ? sanitizeReturnTo(storedReturnTo) : null;
}

function rememberAuthReturnTo(returnTo) {
  const destination = sanitizeReturnTo(returnTo);
  try {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, destination);
  } catch {
    // The active request can still use the current page as a safe fallback.
  }
}

function clearPendingAuthReturnTo() {
  try {
    sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
  } catch {
    // Nothing else needs to be done when session storage is disabled.
  }
}

function buildAuthUrl(page, returnTo) {
  const authPage = page === "register.html" ? "register.html" : "login.html";
  const url = new URL(authPage, window.location.href);
  url.searchParams.set("returnTo", sanitizeReturnTo(returnTo));
  return `${url.pathname}${url.search}${url.hash}`;
}

function redirectToLogin(returnTo, reason) {
  const destination = sanitizeReturnTo(returnTo || getCurrentPageReturnTo());
  rememberAuthReturnTo(destination);

  const loginUrl = new URL("login.html", window.location.href);
  loginUrl.searchParams.set("returnTo", destination);
  if (reason) loginUrl.searchParams.set("reason", reason);
  window.location.replace(loginUrl.toString());
}

function getPostLoginDestination() {
  const destination = getAuthReturnTo();
  clearPendingAuthReturnTo();
  return destination;
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = Token.get();
  const isAuthRequest = path.startsWith("/auth/");
  if (token && !isAuthRequest) headers.set("Authorization", `Bearer ${token}`);

  const requestBody =
    options.body && typeof options.body === "object"
      ? JSON.stringify(options.body)
      : options.body;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, body: requestBody });
  } catch {
    throw new Error("Cannot reach server. Is the backend running?");
  }

  const parsedData = await response.json().catch(() => ({}));
  const data = parsedData && typeof parsedData === "object" ? parsedData : {};
  const isAuthenticationFailure =
    data.code === "AUTH_REQUIRED" ||
    data.code === "TOKEN_INVALID" ||
    (response.status === 401 && !isAuthRequest);
  if (response.status === 401 && isAuthenticationFailure) {
    Token.clear();
    Token.clearUser();
    redirectToLogin(
      getPendingAuthReturnTo() || getCurrentPageReturnTo(),
      data.code === "TOKEN_INVALID" ? "session-expired" : "login-required"
    );
    const error = new Error(data.message || "Authentication required.");
    error.status = 401;
    error.authRedirect = true;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(data.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

const api = {
  get: (path, options = {}) => apiFetch(path, { ...options, method: "GET" }),
  post: (path, data, options = {}) =>
    apiFetch(path, { ...options, method: "POST", body: JSON.stringify(data) }),
  patch: (path, data, options = {}) =>
    apiFetch(path, { ...options, method: "PATCH", body: JSON.stringify(data) }),
  put: (path, data, options = {}) =>
    apiFetch(path, { ...options, method: "PUT", body: JSON.stringify(data) }),
  del: (path, options = {}) => apiFetch(path, { ...options, method: "DELETE" }),
};
