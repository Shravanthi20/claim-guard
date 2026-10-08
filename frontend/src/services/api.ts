import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}
