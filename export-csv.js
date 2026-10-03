/**
 * Mengekspor daftar transaksi terfilter ke CSV berdasarkan periode
 */
export function exportToCSV(transactions, dateRange, periodLabel) {
  let filteredData = transactions;
  if (dateRange && dateRange.startDate && dateRange.endDate) {
    filteredData = transactions.filter(tx => tx.date >= dateRange.startDate && tx.date <= dateRange.endDate);
  }

  if (filteredData.length === 0) {
    alert(`Tidak ada data transaksi untuk periode ${periodLabel}!`);
    return;
  }

  const headers = ["No", "Tanggal", "Jenis", "Kategori", "Deskripsi", "Rekening Sumber", "Rekening Tujuan", "Nominal"];
  const rows = filteredData.map((tx, index) => [
    index + 1,
    tx.date,
    tx.type,
    `"${tx.categoryName || ''}"`,
    `"${tx.notes || ''}"`,
    `"${tx.accountName || tx.sourceAccountName || ''}"`,
    `"${tx.destinationAccountName || ''}"`,
    tx.amount
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `financial-record-${periodLabel.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);

  link.click();
  document.body.removeChild(link);
}
