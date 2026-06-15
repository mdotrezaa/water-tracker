// Web Notifications — desktop only (iOS Safari doesn't support this)
export function isWebNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window;
}

export function getWebNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isWebNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestWebNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isWebNotificationSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

export function sendWebNotification(): void {
  if (!isWebNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  new Notification("💧 Time to drink water!", {
    body: "Stay hydrated 🚰",
    icon: "/favicon.ico",
  });
}

// Soft chime using Web Audio API — works on all browsers including mobile
// (must be called from a user-gesture context the first time AudioContext is created)
let audioCtx: AudioContext | null = null;

export function initAudio(): void {
  if (typeof window === "undefined") return;
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
}

export function playChime(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = audioCtx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtx = ctx;

    // Three ascending notes: C5 → E5 → G5
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.value = freq;

      const start = ctx.currentTime + i * 0.18;
      const end = start + 0.35;

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, end);

      osc.start(start);
      osc.stop(end);
    });
  } catch {
    // Audio not available — silent fail
  }
}
