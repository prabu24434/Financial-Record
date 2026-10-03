import { 
  auth, 
  db, 
  doc, 
  getDoc, 
  updateDoc, 
  signOut, 
  onAuthStateChanged, 
  serverTimestamp 
} from "./firebase.js";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
let lastUpdateThrottled = 0;

/**
 * Memeriksa status otentikasi pengguna dan validasi batas session 90 hari.
 * @param {Function} callback - Dipanggil jika pengguna valid
 */
export function requireAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "./login.html";
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const lastActivityAt = data.lastActivityAt ? data.lastActivityAt.toDate().getTime() : Date.now();
        const currentTime = Date.now();

        // Cek jika tidak aktif lebih dari 90 hari
        if (currentTime - lastActivityAt > NINETY_DAYS_MS) {
          alert("Session kamu telah berakhir karena sudah lebih dari 90 hari tidak aktif. Silakan login kembali.");
          await signOut(auth);
          window.location.href = "./login.html";
          return;
        }

        // Perbarui lastActivityAt dengan throttling (maksimal 1 write per 5 menit)
        updateActivityThrottled(user.uid);
      }

      if (callback) callback(user);
    } catch (error) {
      console.error("Error pada pemeriksaan session:", error);
    }
  });
}

/**
 * Throttling pembaruan aktivitas ke Firestore agar hemat kuota write.
 */
function updateActivityThrottled(uid) {
  const now = Date.now();
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  if (now - lastUpdateThrottled > FIVE_MINUTES_MS) {
    lastUpdateThrottled = now;
    const userRef = doc(db, "users", uid);
    updateDoc(userRef, {
      lastActivityAt: serverTimestamp()
    }).catch((err) => console.error("Gagal memperbarui lastActivityAt:", err));
  }
}
