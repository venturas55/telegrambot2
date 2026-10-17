const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");
let sessionCookie = "";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  if (!API_BASE_URL) {
    throw new Error(
      "Configura EXPO_PUBLIC_API_URL en admin-panel/mobile/.env antes de conectar."
    );
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Comprueba la URL y la red.");
  }

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    sessionCookie = setCookie.split(";", 1)[0];
  }

  const contentType = response.headers.get("content-type") || "";
  const result = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    if (response.status === 401) {
      sessionCookie = "";
    }
    throw new ApiError(
      result?.message || `Error del servidor (${response.status}).`,
      response.status
    );
  }

  if (!result) {
    throw new Error("El servidor no devolvió una respuesta JSON válida.");
  }

  return result;
}

function post(path, body) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function getUsers() {
  return request("/api/users");
}

export function login(username, password) {
  return post("/api/auth/login", { username, password });
}

export function getSession() {
  return request("/api/auth/session");
}

export function logout() {
  return request("/logout").finally(() => {
    sessionCookie = "";
  });
}

export function activateSubscription(subscripcion_id) {
  return patch(`/api/subscriptions/${encodeURIComponent(subscripcion_id)}/activate`);
}

export function revokeSubscription(subscripcion_id) {
  return patch(`/api/subscriptions/${encodeURIComponent(subscripcion_id)}/revoke`);
}

export function paySubscription(telegram_id, subscripcion_id) {
  return post("/api/payments", { telegram_id, subscripcion_id });
}

export function updateExpiration(subscripcion_id, end_date) {
  return patch(`/api/subscriptions/${encodeURIComponent(subscripcion_id)}/expiration`, { end_date });
}

export function removeUser(telegram_id) {
  return request(`/api/users/${encodeURIComponent(telegram_id)}`, {
    method: "DELETE"
  });
}

function patch(path, body) {
  return request(path, {
    method: "PATCH",
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}
