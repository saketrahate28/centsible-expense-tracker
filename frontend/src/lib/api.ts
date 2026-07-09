// Thin API client using fetch; stores JWT in expo-secure-store (mobile) / localStorage (web).
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";
const TOKEN_KEY = "centsible.token";

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null; }
    catch { return null; }
  }
  try { return await SecureStore.getItemAsync(TOKEN_KEY); }
  catch { return null; }
}

export async function setToken(token: string | null) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

type Options = { method?: string; body?: unknown; auth?: boolean };

export async function apiFetch<T = any>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) {
    const t = await getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE}/api${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && data.detail) || `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as T;
}

// Typed endpoints
export const api = {
  // Auth
  requestOtp: (identifier: string) => apiFetch<{ ok: boolean; devOTP: string }>("/Auth/login", { method: "POST", body: { identifier }, auth: false }),
  verifyOtp: (identifier: string, otp: string) => apiFetch<{ token: string; user: any }>("/Auth/verify", { method: "POST", body: { identifier, otp }, auth: false }),
  googleSession: (session_id: string) => apiFetch<{ token: string; user: any }>("/Auth/google/session", { method: "POST", body: { session_id }, auth: false }),
  me: () => apiFetch<{ user: any }>("/Auth/me"),
  logout: () => apiFetch("/Auth/logout", { method: "POST" }),
  // Users
  onboarding: (body: { name: string; age: number; bank_count: number; city?: string }) =>
    apiFetch<{ user: any }>("/Users/onboarding", { method: "POST", body }),
  patchUser: (body: Partial<{ name: string; age: number; city: string; avatar: string }>) =>
    apiFetch<{ user: any }>("/Users/me", { method: "PATCH", body }),
  setBudget: (limit: number) => apiFetch<{ budget_limit: number }>("/Users/me/budget", { method: "POST", body: { limit } }),
  accounts: () => apiFetch<{ accounts: { id: string; name: string; last4: string }[] }>("/Users/me/accounts"),
  // Transactions
  createTxn: (body: any) => apiFetch<{ transaction: any }>("/Transactions/sms", { method: "POST", body }),
  listTxns: (params: { q?: string; category?: string; account?: string; limit?: number; skip?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.q) q.set("q", params.q);
    if (params.category) q.set("category", params.category);
    if (params.account) q.set("account", params.account);
    if (params.limit) q.set("limit", String(params.limit));
    if (params.skip) q.set("skip", String(params.skip));
    const s = q.toString();
    return apiFetch<{ items: any[]; total: number }>(`/Transactions${s ? "?" + s : ""}`);
  },
  dashboard: (account?: string) => apiFetch<any>(`/Transactions/dashboard${account && account !== "all" ? `?account=${account}` : ""}`),
  analytics: (timeframe: "week" | "month" | "year") => apiFetch<any>(`/Transactions/analytics?timeframe=${timeframe}`),
  updateCategory: (id: string, category: string) => apiFetch(`/Transactions/${id}/category`, { method: "PATCH", body: { category } }),
  updateTxn: (id: string, body: any) => apiFetch(`/Transactions/${id}`, { method: "PATCH", body }),
  deleteTxn: (id: string) => apiFetch(`/Transactions/${id}`, { method: "DELETE" }),
  // Income
  createIncome: (body: { amount: number; source: string; note?: string }) =>
    apiFetch("/Income", { method: "POST", body }),
  listIncome: () => apiFetch<{ items: any[]; monthly_total: number; total: number }>("/Income"),
  // Groups
  createGroup: (name: string, members: string[]) => apiFetch<{ group: any }>("/Groups", { method: "POST", body: { name, members } }),
  listGroups: () => apiFetch<{ items: any[] }>("/Groups"),
  getGroup: (id: string) => apiFetch<{ group: any }>(`/Groups/${id}`),
  addGroupExpense: (id: string, body: any) => apiFetch(`/Groups/${id}/expenses`, { method: "POST", body }),
  deleteGroup: (id: string) => apiFetch(`/Groups/${id}`, { method: "DELETE" }),
  // AI
  financeTerm: () => apiFetch<{ term: string; definition: string; example: string; tip: string }>("/AI/finance-term"),
  aiInsight: () => apiFetch<{ insight: string }>("/AI/insight"),
  aiChat: (message: string, session_id?: string) => apiFetch<{ reply: string; session_id: string }>("/AI/chat", { method: "POST", body: { message, session_id } }),
  chatHistory: () => apiFetch<{ items: any[] }>("/AI/chat/history"),
  // Meta
  categories: () => apiFetch<{ items: string[] }>("/categories"),
  exportUrl: () => `${BASE}/api/Transactions/export`,
  // Billing / Pro (Razorpay)
  billingPlans: () => apiFetch<{ razorpay_enabled: boolean; plans: { id: string; name: string; amount: number; currency: string; interval: string; highlight: string }[] }>("/Billing/plans", { auth: false }),
  billingOrder: (plan: "monthly" | "yearly") =>
    apiFetch<{ order_id: string; amount: number; currency: string; key_id: string; plan_name: string; user_name?: string; user_email?: string; user_phone?: string }>("/Billing/order", { method: "POST", body: { plan } }),
  billingVerify: (payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; plan: string }) =>
    apiFetch<{ paid: boolean; plan: string; user: any }>("/Billing/verify", { method: "POST", body: payload }),
  billingMockActivate: (plan: "monthly" | "yearly") =>
    apiFetch<{ ok: boolean; user: any }>("/Billing/mock-activate", { method: "POST", body: { plan } }),
};

export type User = {
  user_id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  age?: number | null;
  bank_count?: number;
  city?: string | null;
  budget_limit?: number;
  is_onboarded?: boolean;
  avatar?: string | null;
  is_pro?: boolean;
  pro_plan?: string | null;
  pro_expires_at?: string | null;
};

export type Transaction = {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  date: string;
  payment_method: string;
  account_reference: string;
  note: string;
  type: string;
};

export { getToken };
