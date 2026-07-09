// Razorpay checkout helpers — dynamically load the SDK on web,
// and open Razorpay's hosted checkout page on native via WebBrowser.
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

type OrderContext = {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  plan_name: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
};

type CheckoutResult =
  | { ok: true; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
  | { ok: false; reason: "dismissed" | "error"; message?: string };

declare global {
  interface Window { Razorpay?: any }
}

function loadWebScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") return reject(new Error("no document"));
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("failed to load Razorpay SDK"));
    document.head.appendChild(s);
  });
}

export async function openRazorpayCheckout(order: OrderContext): Promise<CheckoutResult> {
  // Web: open Razorpay Checkout overlay
  if (Platform.OS === "web") {
    try {
      await loadWebScript("https://checkout.razorpay.com/v1/checkout.js");
      return await new Promise<CheckoutResult>((resolve) => {
        const rzp = new window.Razorpay({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          order_id: order.order_id,
          name: "Centsible",
          description: order.plan_name,
          image: undefined,
          theme: { color: "#06B6D4" },
          prefill: {
            name: order.user_name || "",
            email: order.user_email || "",
            contact: order.user_phone || "",
          },
          modal: {
            ondismiss: () => resolve({ ok: false, reason: "dismissed" }),
          },
          handler: (resp: any) => {
            resolve({
              ok: true,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
          },
        });
        rzp.on("payment.failed", (resp: any) => resolve({ ok: false, reason: "error", message: resp.error?.description }));
        rzp.open();
      });
    } catch (e: any) {
      return { ok: false, reason: "error", message: e.message };
    }
  }

  // Native: open Razorpay's hosted checkout page in a browser tab.
  // Requires a small HTML page hosted somewhere, OR use the standard checkout URL.
  // The simplest reliable path is to open the payment page URL Razorpay provides after order creation.
  // Razorpay does not expose a bare hosted URL from order.create, so we redirect via our backend fallback.
  // For a launched app, replace with react-native-razorpay for a native modal.
  return { ok: false, reason: "error", message: "Mobile native checkout requires react-native-razorpay in a build." };
}

export function returnUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin + "/pro";
  }
  return Linking.createURL("pro");
}
