import { 
  getAccounts, 
  getTransactions, 
  getBudgets, 
  getGoals, 
  getDebts, 
  getSubscriptions,
  addAccount,
  addTransaction,
  addBudget,
  addGoal,
  addSubscription
} from "./storage.js";

/**
 * Ekspor seluruh data keuangan pengguna ke file JSON
 */
export async function exportBackupJSON(uid) {
  const [accounts, transactions, budgets, goals, debts, subscriptions] = await Promise.all([
    getAccounts(uid),
    getTransactions(uid),
    getBudgets(uid),
    getGoals(uid),
    getDebts(uid),
    getSubscriptions(uid)
  ]);

  const backupData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    accounts,
    transactions,
    budgets,
    goals,
    debts,
    subscriptions
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `financial-record-backup-${new Date().toISOString().split("T")[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Restore data keuangan dari file JSON
 */
export async function restoreBackupJSON(uid, file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (!data.accounts || !data.transactions) {
          throw new Error("Format file backup JSON tidak valid!");
        }

        // Restore Rekening
        for (const acc of data.accounts) {
          await addAccount(uid, { name: acc.name, type: acc.type, balance: acc.balance });
        }

        // Restore Transaksi
        for (const tx of data.transactions) {
          await addTransaction(uid, tx);
        }

        // Restore Budgets
        if (data.budgets) {
          for (const bg of data.budgets) {
            await addBudget(uid, bg);
          }
        }

        // Restore Goals
        if (data.goals) {
          for (const g of data.goals) {
            await addGoal(uid, g);
          }
        }

        // Restore Subscriptions
        if (data.subscriptions) {
          for (const s of data.subscriptions) {
            await addSubscription(uid, s);
          }
        }

        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}
