import { formatRupiah, formatDateIndo } from "./utils.js";
import { getAccounts, getDebts } from "./storage.js";

/**
 * Filter Transaksi berdasarkan Rentang Periode (Harian, Bulanan, Kuartalan, Tahunan)
 */
function filterTransactionsByPeriod(transactions, dateRange) {
  if (!dateRange || !dateRange.startDate || !dateRange.endDate) return transactions;
  return transactions.filter(tx => tx.date >= dateRange.startDate && tx.date <= dateRange.endDate);
}

/**
 * Mengekspor laporan PDF dengan filter periode terstruktur
 */
export async function exportToPDF(transactions, dateRange, periodLabel, userProfile, uid) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const filteredData = filterTransactionsByPeriod(transactions, dateRange);

  const [accounts, debts] = await Promise.all([
    getAccounts(uid),
    getDebts(uid)
  ]);

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const totalUtang = debts.filter(d => d.type === "utang" && d.status !== "Lunas").reduce((sum, d) => sum + Number(d.remainingAmount ?? d.amount), 0);
  const totalPiutang = debts.filter(d => d.type === "piutang" && d.status !== "Lunas").reduce((sum, d) => sum + Number(d.remainingAmount ?? d.amount), 0);

  let totalInc = 0;
  let totalExp = 0;
  filteredData.forEach(tx => {
    if (tx.type === "income") totalInc += Number(tx.amount);
    if (tx.type === "expense") totalExp += Number(tx.amount);
  });

  const cashFlow = totalInc - totalExp;
  const savingRate = totalInc > 0 ? Math.round(((totalInc - totalExp) / totalInc) * 100) : 0;
  const expenseRatio = totalInc > 0 ? Math.round((totalExp / totalInc) * 100) : 0;

  // Header Laporan
  doc.setFontSize(18);
  doc.text("FINANCIAL RECORD", 14, 15);
  doc.setFontSize(10);
  doc.text(`Laporan Keuangan (${periodLabel})`, 14, 21);
  doc.line(14, 24, 196, 24);

  // Informasi Pengguna
  doc.setFontSize(9);
  doc.text(`Nama Pengguna : ${userProfile?.name || 'User'}`, 14, 30);
  doc.text(`Email         : ${userProfile?.email || '-'}`, 14, 35);
  doc.text(`Tanggal Cetak : ${formatDateIndo(new Date().toISOString().split("T")[0])}`, 14, 40);

  // Ringkasan Keuangan
  let yPos = 48;
  doc.setFontSize(10);
  doc.text(`RINGKASAN KEUSANGAN PERIODE (${periodLabel.toUpperCase()}):`, 14, yPos);
  
  doc.setFontSize(9);
  doc.text(`- Total Saldo Rekening : ${formatRupiah(totalBalance)}`, 14, yPos + 6);
  doc.text(`- Total Pemasukan      : ${formatRupiah(totalInc)}`, 14, yPos + 12);
  doc.text(`- Total Pengeluaran    : ${formatRupiah(totalExp)}`, 14, yPos + 18);
  doc.text(`- Cash Flow            : ${formatRupiah(cashFlow)}`, 14, yPos + 24);
  doc.text(`- Saving Rate          : ${savingRate}%`, 110, yPos + 6);
  doc.text(`- Expense Ratio        : ${expenseRatio}%`, 110, yPos + 12);
  doc.text(`- Sisa Utang           : ${formatRupiah(totalUtang)}`, 110, yPos + 18);
  doc.text(`- Sisa Piutang         : ${formatRupiah(totalPiutang)}`, 110, yPos + 24);

  // Tabel Transaksi
  const tableRows = filteredData.map((tx, index) => {
    let jenis = "Pengeluaran";
    if (tx.type === "income") jenis = "Pemasukan";
    if (tx.type === "transfer") jenis = "Transfer";

    let detailRekening = tx.accountName || "-";
    if (tx.type === "transfer") {
      detailRekening = `${tx.sourceAccountName || '-'} -> ${tx.destinationAccountName || '-'}`;
    }

    return [
      index + 1,
      formatDateIndo(tx.date),
      jenis,
      tx.categoryName || "-",
      tx.notes || "-",
      detailRekening,
      formatRupiah(tx.amount)
    ];
  });

  doc.autoTable({
    startY: yPos + 32,
    head: [["No", "Tanggal", "Jenis", "Kategori", "Deskripsi", "Rekening", "Nominal"]],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [0, 102, 204] },
    styles: { fontSize: 8 },
    margin: { top: 20 }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Halaman ${i} dari ${pageCount} - Financial Record`, 14, 287);
  }

  doc.save(`financial-record-${periodLabel.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split("T")[0]}.pdf`);
}
