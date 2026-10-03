/**
 * Inisialisasi Tema saat halaman dimuat
 */
export function initTheme() {
  const savedTheme = localStorage.getItem("app_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeButtonText(savedTheme);
  return savedTheme;
}

/**
 * Mengubah Tema antara Dark Mode dan Light Mode
 */
export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", currentTheme);
  localStorage.setItem("app_theme", currentTheme);
  updateThemeButtonText(currentTheme);
  return currentTheme;
}

/**
 * Memperbarui Teks Tombol Mode Gelap / Mode Terang
 */
function updateThemeButtonText(theme) {
  const btn = document.getElementById("btn-toggle-theme");
  const label = document.getElementById("theme-status-label");
  if (btn) {
    btn.textContent = theme === "dark" ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap";
  }
  if (label) {
    label.textContent = theme === "dark" ? "Mode Gelap (Aktif)" : "Mode Terang (Aktif)";
  }
}
