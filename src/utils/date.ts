/**
 * Tanggal hari ini (YYYY-MM-DD) menurut jam perangkat.
 * Jangan pakai new Date().toISOString(): itu tanggal UTC, sehingga pencatatan pukul 00.00–08.00 WITA
 * (00.00–07.00 WIB) tercatat sebagai tanggal kemarin, bahkan bisa masuk ke bulan sebelumnya.
 */
export function todayLocal(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
