import { 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from "./firebase.js";
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  writeBatch 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- PROFILE ---
export async function getUserProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}

// --- CATEGORIES ---
export const DEFAULT_INCOME_CATEGORIES = [
  "Gaji", "Uang Saku", "Bonus", "Penjualan", "Investasi", "Lainnya"
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Makanan", "Transportasi", "Pendidikan", "Tagihan", "Belanja", "Hiburan", "Kesehatan", "Rumah", "Investasi", "Lainnya"
];

export async function getCategories(uid) {
  try {
    const catRef = collection(db, "users", uid, "categories");
    const snap = await getDocs(catRef);
    const customCategories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const income = [...DEFAULT_INCOME_CATEGORIES];
    const expense = [...DEFAULT_EXPENSE_CATEGORIES];

    customCategories.forEach(c => {
      if (c.type === "income" && !income.includes(c.name)) income.push(c.name);
      if (c.type === "expense" && !expense.includes(c.name)) expense.push(c.name);
    });

    return { income, expense, custom: customCategories };
  } catch (err) {
    console.error("Gagal mengambil kategori:", err);
    return { income: DEFAULT_INCOME_CATEGORIES, expense: DEFAULT_EXPENSE_CATEGORIES, custom: [] };
  }
}

// --- ACCOUNTS ---
export async function getAccounts(uid) {
  const accRef = collection(db, "users", uid, "accounts");
  const q = query(accRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addAccount(uid, accountData) {
  const accRef = collection(db, "users", uid, "accounts");
  return await addDoc(accRef, {
    ...accountData,
    balance: Number(accountData.balance) || 0,
    createdAt: serverTimestamp()
  });
}

export async function updateAccount(uid, accountId, accountData) {
  const accRef = doc(db, "users", uid, "accounts", accountId);
  return await updateDoc(accRef, {
    name: accountData.name,
    type: accountData.type,
    balance: Number(accountData.balance) || 0,
    updatedAt: serverTimestamp()
  });
}

export async function deleteAccount(uid, accountId) {
  const accRef = doc(db, "users", uid, "accounts", accountId);
  return await deleteDoc(accRef);
}

// --- TRANSACTIONS (DENGAN TIMESTAMP DETIK/MENIT/JAM) ---
export async function getTransactions(uid) {
  const txRef = collection(db, "users", uid, "transactions");
  const q = query(txRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data,
      // Konversi serverTimestamp ke Epoch Time / Date untuk pengurutan
      timestamp: data.createdAt ? (data.createdAt.seconds * 1000) : Date.now()
    };
  });
}

export async function addTransaction(uid, txData) {
  const batch = writeBatch(db);
  const txCollection = collection(db, "users", uid, "transactions");
  const newTxRef = doc(txCollection);

  const amount = Number(txData.amount);
  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const dataToSave = {
    type: txData.type,
    amount: amount,
    date: txData.date || now.toISOString().split("T")[0],
    time: txData.time || timeString,
    notes: txData.notes || "",
    createdAt: serverTimestamp()
  };

  if (txData.type === "income") {
    dataToSave.accountId = txData.accountId;
    dataToSave.accountName = txData.accountName;
    dataToSave.categoryName = txData.categoryName;

    const accRef = doc(db, "users", uid, "accounts", txData.accountId);
    const accSnap = await getDoc(accRef);
    if (accSnap.exists()) {
      batch.update(accRef, { balance: (accSnap.data().balance || 0) + amount });
    }
  } else if (txData.type === "expense") {
    dataToSave.accountId = txData.accountId;
    dataToSave.accountName = txData.accountName;
    dataToSave.categoryName = txData.categoryName;

    const accRef = doc(db, "users", uid, "accounts", txData.accountId);
    const accSnap = await getDoc(accRef);
    if (accSnap.exists()) {
      batch.update(accRef, { balance: (accSnap.data().balance || 0) - amount });
    }
  } else if (txData.type === "transfer") {
    dataToSave.sourceAccountId = txData.sourceAccountId;
    dataToSave.sourceAccountName = txData.sourceAccountName;
    dataToSave.destinationAccountId = txData.destinationAccountId;
    dataToSave.destinationAccountName = txData.destinationAccountName;

    if (txData.sourceAccountId) {
      const srcRef = doc(db, "users", uid, "accounts", txData.sourceAccountId);
      const srcSnap = await getDoc(srcRef);
      if (srcSnap.exists()) {
        batch.update(srcRef, { balance: (srcSnap.data().balance || 0) - amount });
      }
    }

    if (txData.destinationAccountId) {
      const destRef = doc(db, "users", uid, "accounts", txData.destinationAccountId);
      const destSnap = await getDoc(destRef);
      if (destSnap.exists()) {
        batch.update(destRef, { balance: (destSnap.data().balance || 0) + amount });
      }
    }
  }

  batch.set(newTxRef, dataToSave);
  await batch.commit();
  return newTxRef.id;
}

export async function deleteTransaction(uid, transaction) {
  const batch = writeBatch(db);
  const txRef = doc(db, "users", uid, "transactions", transaction.id);
  const amount = Number(transaction.amount);

  if (transaction.type === "income") {
    const accRef = doc(db, "users", uid, "accounts", transaction.accountId);
    const accSnap = await getDoc(accRef);
    if (accSnap.exists()) {
      batch.update(accRef, { balance: (accSnap.data().balance || 0) - amount });
    }
  } else if (transaction.type === "expense") {
    const accRef = doc(db, "users", uid, "accounts", transaction.accountId);
    const accSnap = await getDoc(accRef);
    if (accSnap.exists()) {
      batch.update(accRef, { balance: (accSnap.data().balance || 0) + amount });
    }
  } else if (transaction.type === "transfer") {
    if (transaction.sourceAccountId) {
      const srcRef = doc(db, "users", uid, "accounts", transaction.sourceAccountId);
      const srcSnap = await getDoc(srcRef);
      if (srcSnap.exists()) {
        batch.update(srcRef, { balance: (srcSnap.data().balance || 0) + amount });
      }
    }

    if (transaction.destinationAccountId) {
      const destRef = doc(db, "users", uid, "accounts", transaction.destinationAccountId);
      const destSnap = await getDoc(destRef);
      if (destSnap.exists()) {
        batch.update(destRef, { balance: (destSnap.data().balance || 0) - amount });
      }
    }
  }

  batch.delete(txRef);
  await batch.commit();
}

export async function updateTransaction(uid, oldTx, newTxData) {
  await deleteTransaction(uid, oldTx);
  await addTransaction(uid, newTxData);
}

// --- BUDGETS ---
export async function getBudgets(uid) {
  const ref = collection(db, "users", uid, "budgets");
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addBudget(uid, budgetData) {
  const ref = collection(db, "users", uid, "budgets");
  return await addDoc(ref, {
    categoryName: budgetData.categoryName,
    amount: Number(budgetData.amount),
    createdAt: serverTimestamp()
  });
}

export async function deleteBudget(uid, budgetId) {
  const ref = doc(db, "users", uid, "budgets", budgetId);
  return await deleteDoc(ref);
}

// --- GOALS ---
export async function getGoals(uid) {
  const ref = collection(db, "users", uid, "goals");
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addGoal(uid, goalData) {
  const ref = collection(db, "users", uid, "goals");
  return await addDoc(ref, {
    name: goalData.name,
    targetAmount: Number(goalData.targetAmount),
    currentAmount: Number(goalData.currentAmount) || 0,
    startDate: goalData.startDate || new Date().toISOString().split("T")[0],
    deadline: goalData.deadline || "",
    createdAt: serverTimestamp()
  });
}

export async function updateGoalWithTransaction(uid, goal, amount, accountId, accountName, isDeposit) {
  const today = new Date().toISOString().split("T")[0];
  const numAmount = Number(amount);

  if (isDeposit) {
    await addTransaction(uid, {
      type: "transfer",
      amount: numAmount,
      sourceAccountId: accountId,
      sourceAccountName: accountName,
      destinationAccountId: "",
      destinationAccountName: `Goal: ${goal.name}`,
      date: today,
      notes: `Menabung untuk Goal: ${goal.name}`
    });
  } else {
    await addTransaction(uid, {
      type: "transfer",
      amount: numAmount,
      sourceAccountId: "",
      sourceAccountName: `Goal: ${goal.name}`,
      destinationAccountId: accountId,
      destinationAccountName: accountName,
      date: today,
      notes: `Penarikan dana dari Goal: ${goal.name}`
    });
  }

  const goalRef = doc(db, "users", uid, "goals", goal.id);
  const newBalance = isDeposit ? (Number(goal.currentAmount) + numAmount) : (Number(goal.currentAmount) - numAmount);
  await updateDoc(goalRef, {
    currentAmount: Math.max(0, newBalance),
    updatedAt: serverTimestamp()
  });
}

export async function deleteGoal(uid, goalId) {
  const ref = doc(db, "users", uid, "goals", goalId);
  return await deleteDoc(ref);
}

// --- DEBTS ---
export async function getDebts(uid) {
  const ref = collection(db, "users", uid, "debts");
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addDebtWithTransaction(uid, debtData, accountId, accountName) {
  const ref = collection(db, "users", uid, "debts");
  const today = new Date().toISOString().split("T")[0];
  const amount = Number(debtData.amount);

  const docRef = await addDoc(ref, {
    name: debtData.name,
    type: debtData.type,
    amount: amount,
    remainingAmount: amount,
    dueDate: debtData.dueDate || "",
    status: "Belum lunas",
    createdAt: serverTimestamp()
  });

  if (debtData.type === "utang") {
    await addTransaction(uid, {
      type: "income",
      amount: amount,
      accountId: accountId,
      accountName: accountName,
      categoryName: "Lainnya",
      date: today,
      notes: `Penerimaan Utang: ${debtData.name}`
    });
  } else {
    await addTransaction(uid, {
      type: "expense",
      amount: amount,
      accountId: accountId,
      accountName: accountName,
      categoryName: "Lainnya",
      date: today,
      notes: `Pemberian Piutang: ${debtData.name}`
    });
  }

  return docRef.id;
}

export async function payDebtPartialWithTransaction(uid, debt, payAmount, accountId, accountName) {
  const today = new Date().toISOString().split("T")[0];
  const amount = Number(payAmount);
  const currentRemaining = Number(debt.remainingAmount ?? debt.amount);
  const newRemaining = Math.max(0, currentRemaining - amount);
  const newStatus = newRemaining === 0 ? "Lunas" : "Sebagian";

  if (debt.type === "utang") {
    await addTransaction(uid, {
      type: "expense",
      amount: amount,
      accountId: accountId,
      accountName: accountName,
      categoryName: "Tagihan",
      date: today,
      notes: `Pembayaran Utang: ${debt.name}`
    });
  } else {
    await addTransaction(uid, {
      type: "income",
      amount: amount,
      accountId: accountId,
      accountName: accountName,
      categoryName: "Lainnya",
      date: today,
      notes: `Pelunasan Piutang: ${debt.name}`
    });
  }

  const debtRef = doc(db, "users", uid, "debts", debt.id);
  await updateDoc(debtRef, { 
    remainingAmount: newRemaining,
    status: newStatus, 
    updatedAt: serverTimestamp() 
  });
}

export async function deleteDebt(uid, debtId) {
  const ref = doc(db, "users", uid, "debts", debtId);
  return await deleteDoc(ref);
}

// --- SUBSCRIPTIONS ---
export async function getSubscriptions(uid) {
  const ref = collection(db, "users", uid, "subscriptions");
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addSubscription(uid, subData) {
  const ref = collection(db, "users", uid, "subscriptions");
  return await addDoc(ref, {
    name: subData.name,
    amount: Number(subData.amount),
    billingCycle: subData.billingCycle,
    createdAt: serverTimestamp()
  });
}

export async function paySubscriptionWithTransaction(uid, sub, accountId, accountName) {
  const today = new Date().toISOString().split("T")[0];

  await addTransaction(uid, {
    type: "expense",
    amount: Number(sub.amount),
    accountId: accountId,
    accountName: accountName,
    categoryName: "Tagihan",
    date: today,
    notes: `Pembayaran Subskripsi: ${sub.name}`
  });
}

export async function deleteSubscription(uid, subId) {
  const ref = doc(db, "users", uid, "subscriptions", subId);
  return await deleteDoc(ref);
}

// --- RECURRING TRANSACTIONS ---
export async function getRecurringTransactions(uid) {
  const ref = collection(db, "users", uid, "recurringTransactions");
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function checkAndProcessRecurring(uid) {
  const recurrings = await getRecurringTransactions(uid);
  const today = new Date().toISOString().split("T")[0];

  for (const rec of recurrings) {
    if (rec.lastProcessed < today) {
      let shouldProcess = false;
      const lastDate = new Date(rec.lastProcessed);
      const currentDate = new Date(today);
      const diffDays = Math.ceil(Math.abs(currentDate - lastDate) / (1000 * 60 * 60 * 24));

      if (rec.frequency === "harian" && diffDays >= 1) shouldProcess = true;
      if (rec.frequency === "mingguan" && diffDays >= 7) shouldProcess = true;
      if (rec.frequency === "bulanan" && diffDays >= 30) shouldProcess = true;

      if (shouldProcess) {
        await addTransaction(uid, {
          type: rec.type,
          amount: rec.amount,
          accountId: rec.accountId,
          accountName: rec.accountName,
          categoryName: rec.categoryName,
          date: today,
          notes: `[Otomatis Berulang] ${rec.notes}`
        });

        const ref = doc(db, "users", uid, "recurringTransactions", rec.id);
        await updateDoc(ref, { lastProcessed: today });
      }
    }
  }
}
