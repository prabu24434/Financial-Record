/**
 * Memfilter dan mengurutkan transaksi presisi berdasarkan Tanggal, Jam, Menit, dan Detik
 */
export function getFilteredTransactions(transactions, filters) {
  let result = [...transactions];

  // 1. Filter Pencarian Teks (Keterangan, Kategori, Rekening)
  if (filters.search && filters.search.trim() !== "") {
    const query = filters.search.toLowerCase().trim();
    result = result.filter(tx => {
      const notes = (tx.notes || "").toLowerCase();
      const category = (tx.categoryName || "").toLowerCase();
      const account = (tx.accountName || tx.sourceAccountName || tx.destinationAccountName || "").toLowerCase();
      return notes.includes(query) || category.includes(query) || account.includes(query);
    });
  }

  // 2. Filter Jenis Transaksi
  if (filters.type && filters.type !== "all") {
    result = result.filter(tx => tx.type === filters.type);
  }

  // 3. Pengurutan Presisi (Presisi hingga Jam, Menit, Detik via Timestamp)
  if (filters.sortBy) {
    result.sort((a, b) => {
      // Gabungkan Date string (YYYY-MM-DD) dan Time string (HH:mm:ss) jika timestamp tidak ada
      const timeA = a.timestamp || new Date(`${a.date}T${a.time || '00:00:00'}`).getTime();
      const timeB = b.timestamp || new Date(`${b.date}T${b.time || '00:00:00'}`).getTime();

      if (filters.sortBy === "date-desc") return timeB - timeA; // Terbaru
      if (filters.sortBy === "date-asc") return timeA - timeB;  // Terlama
      if (filters.sortBy === "amount-desc") return Number(b.amount) - Number(a.amount); // Nominal Terbesar
      if (filters.sortBy === "amount-asc") return Number(a.amount) - Number(b.amount);  // Nominal Terkecil
      return 0;
    });
  }

  return result;
}
