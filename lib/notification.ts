export type NotificationPermission = "granted" | "denied" | "default" | "unsupported";

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  const result = await Notification.requestPermission();
  return result;
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function sendWaterReminder(): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  new Notification("💧 Time to drink water!", {
    body: "Stay hydrated 🚰",
    icon: "/favicon.ico",
  });
}
