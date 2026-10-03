import { 
  auth, 
  db, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from "./firebase.js";

// Handler Register
export async function registerUser(name, email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Simpan profil pengguna di Cloud Firestore
  await setDoc(doc(db, "users", user.uid), {
    name: name,
    email: email,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    lastActivityAt: serverTimestamp()
  });

  return user;
}

// Handler Login
export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Update Waktu Login Terakhir dan Aktivitas Terakhir
  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, {
    lastLoginAt: serverTimestamp(),
    lastActivityAt: serverTimestamp()
  });

  return user;
}

// Handler Logout
export async function logoutUser() {
  await signOut(auth);
  window.location.href = "./login.html";
}

// Handler Lupa Password
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}
