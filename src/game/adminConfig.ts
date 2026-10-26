// Yönetici paneli yapılandırması
export const ADMIN_CONFIG = {
  // Varsayılan yönetici şifreleri (Herhangi birini girebilirsin)
  passwords: ["aden", "aden123", "aden2026", "admin123"],
};

export function verifyAdminPassword(input: string): boolean {
  if (!input) return false;
  const clean = input.trim().toLowerCase();
  return ADMIN_CONFIG.passwords.some((p) => p.toLowerCase() === clean);
}

export function isSessionAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem("aden_admin_authorized") === "true";
}

export function setSessionAdmin(auth: boolean): void {
  if (typeof window === "undefined") return;
  if (auth) {
    window.sessionStorage.setItem("aden_admin_authorized", "true");
  } else {
    window.sessionStorage.removeItem("aden_admin_authorized");
  }
}
