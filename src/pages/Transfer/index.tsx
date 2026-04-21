import { useState, useMemo } from "react";
import { useTransaksi } from "../../hooks/useTransaksi";
import { useKasLocation, DEFAULT_KAS_LOCATION_ID } from "../../hooks/useKasLocation";
import {
  ArrowRightLeft,
  ArrowRight,
  Landmark,
  Wallet,
  Building,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

const TRANSFER_CATEGORY_ID = "cat-transfer";

export default function Transfer() {
  const { transactions, addTransaction } = useTransaksi();
  const { locations } = useKasLocation();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [fromKasId, setFromKasId] = useState("");
  const [toKasId, setToKasId] = useState("");
  const [nominal, setNominal] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  // Success feedback
  const [showSuccess, setShowSuccess] = useState(false);

  // Calculate saldo per kas location
  const kasBalances = useMemo(() => {
    const balanceMap: Record<string, number> = {};
    locations.forEach(loc => {
      const locTxs = transactions.filter(t =>
        t.kasLocationId === loc.id || (!t.kasLocationId && loc.id === DEFAULT_KAS_LOCATION_ID)
      );
      const masuk = locTxs.filter(t => t.type === "Pemasukan").reduce((s, t) => s + t.nominal, 0);
      const keluar = locTxs.filter(t => t.type === "Pengeluaran").reduce((s, t) => s + t.nominal, 0);
      balanceMap[loc.id] = masuk - keluar;
    });
    return balanceMap;
  }, [locations, transactions]);

  // Filter transfer-related transactions for history
  const transferHistory = useMemo(() => {
    return transactions
      .filter(t => t.transferId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  // Group transfers by transferId for display
  const groupedTransfers = useMemo(() => {
    const groups: Record<string, { out: typeof transactions[0]; in: typeof transactions[0] | undefined }> = {};
    transferHistory.forEach(tx => {
      if (!tx.transferId) return;
      if (!groups[tx.transferId]) {
        groups[tx.transferId] = { out: tx, in: undefined };
      }
      if (tx.type === "Pengeluaran") {
        groups[tx.transferId].out = tx;
      } else {
        groups[tx.transferId].in = tx;
      }
    });
    return Object.values(groups).sort(
      (a, b) => new Date(b.out.date).getTime() - new Date(a.out.date).getTime()
    );
  }, [transferHistory]);

  const getLocationName = (id?: string) =>
    locations.find(l => l.id === id)?.name || "Kas Utama";
  const getLocationType = (id?: string) =>
    locations.find(l => l.id === id)?.type || "Tunai";

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Tunai": return <Wallet className="w-4 h-4" />;
      case "Bank": return <Building className="w-4 h-4" />;
      case "E-Wallet": return <Wallet className="w-4 h-4" />;
      default: return <Landmark className="w-4 h-4" />;
    }
  };

  const selectedFromBalance = fromKasId ? (kasBalances[fromKasId] || 0) : 0;
  const nominalNum = Number(nominal.replace(/\D/g, "")) || 0;
  const isOverBalance = nominalNum > selectedFromBalance;
  const canSubmit = fromKasId && toKasId && fromKasId !== toKasId && nominalNum > 0 && !isOverBalance;

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setNominal(raw);
  };

  const openModal = () => {
    setFromKasId("");
    setToKasId("");
    setNominal("");
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const transferId = `trf-${Date.now()}`;
    const isoDate = new Date(date).toISOString();
    const fromName = getLocationName(fromKasId);
    const toName = getLocationName(toKasId);
    const desc = description || `Transfer dari ${fromName} ke ${toName}`;

    // Create outgoing transaction (pengeluaran from source)
    await addTransaction({
      date: isoDate,
      categoryId: TRANSFER_CATEGORY_ID,
      type: "Pengeluaran",
      nominal: nominalNum,
      description: desc,
      kasLocationId: fromKasId,
      transferId,
      transferToKasLocationId: toKasId,
    });

    // Create incoming transaction (pemasukan to destination)
    await addTransaction({
      date: isoDate,
      categoryId: TRANSFER_CATEGORY_ID,
      type: "Pemasukan",
      nominal: nominalNum,
      description: desc,
      kasLocationId: toKasId,
      transferId,
    });

    setIsModalOpen(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-green-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            Transfer berhasil dicatat!
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-amber-500" /> Transfer Antar Kas
          </h2>
          <p className="text-gray-500 mt-1">
            Pindahkan dana antar rekening atau lokasi kas RT/RW.
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-sm transition-all hover:shadow-md"
        >
          <ArrowRightLeft className="w-4 h-4" /> Buat Transfer Baru
        </button>
      </div>

      {/* Saldo Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {locations.map(loc => {
          const balance = kasBalances[loc.id] || 0;
          return (
            <div key={loc.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className={`p-3 rounded-xl flex-shrink-0 ${
                loc.type === "Tunai" ? "bg-green-50 text-green-600" :
                loc.type === "Bank" ? "bg-blue-50 text-blue-600" :
                "bg-indigo-50 text-indigo-600"
              }`}>
                {getTypeIcon(loc.type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{loc.type}</p>
                <h4 className="font-bold text-gray-900 text-sm truncate">{loc.name}</h4>
                <p className={`font-bold text-lg leading-none mt-1 ${balance < 0 ? "text-red-500" : "text-green-600"}`}>
                  Rp {balance.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transfer History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-gray-800">Riwayat Transfer Antar Kas</h3>
          <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {groupedTransfers.length} transfer
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-gray-500 font-medium bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Dari Kas</th>
                <th className="px-6 py-4 text-center">→</th>
                <th className="px-6 py-4">Ke Kas</th>
                <th className="px-6 py-4 text-right">Nominal</th>
                <th className="px-6 py-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groupedTransfers.map((group) => {
                const fromLoc = group.out.kasLocationId;
                const toLoc = group.out.transferToKasLocationId || group.in?.kasLocationId;
                return (
                  <tr key={group.out.transferId} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-6 py-4 text-gray-600 font-medium">
                      {new Date(group.out.date).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700">
                        <ArrowUpRight className="w-3 h-3" />
                        {getLocationName(fromLoc)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ArrowRight className="w-4 h-4 text-amber-400 mx-auto" />
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700">
                        <ArrowDownRight className="w-3 h-3" />
                        {getLocationName(toLoc)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-amber-600">
                      Rp {group.out.nominal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate">
                      {group.out.description}
                    </td>
                  </tr>
                );
              })}
              {groupedTransfers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <ArrowRightLeft className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium text-lg">
                      Belum ada riwayat transfer.
                    </p>
                    <p className="text-gray-300 text-sm mt-1">
                      Klik "Buat Transfer Baru" untuk memindahkan dana antar kas.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transfer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center flex-shrink-0 bg-amber-50/80 border-amber-100">
              <h3 className="font-bold text-lg text-amber-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" /> Transfer Antar Kas
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Date */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Tanggal Transfer
                </label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-gray-50/50"
                />
              </div>

              {/* From Kas */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Dari Kas (Sumber Dana)
                </label>
                <div className="relative">
                  <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    required
                    value={fromKasId}
                    onChange={(e) => setFromKasId(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-gray-50/50 font-medium"
                  >
                    <option value="" disabled>Pilih kas sumber...</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id} disabled={loc.id === toKasId}>
                        {loc.name} {loc.type !== "Tunai" ? `(${loc.type})` : ""} — Saldo: Rp {(kasBalances[loc.id] || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                </div>
                {fromKasId && (
                  <p className="mt-1.5 text-xs font-semibold text-gray-500">
                    Saldo tersedia: <span className={`${selectedFromBalance < 0 ? "text-red-500" : "text-green-600"}`}>
                      Rp {selectedFromBalance.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </p>
                )}
              </div>

              {/* To Kas */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Ke Kas (Tujuan)
                </label>
                <div className="relative">
                  <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    required
                    value={toKasId}
                    onChange={(e) => setToKasId(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-gray-50/50 font-medium"
                  >
                    <option value="" disabled>Pilih kas tujuan...</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id} disabled={loc.id === fromKasId}>
                        {loc.name} {loc.type !== "Tunai" ? `(${loc.type})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Same Kas Warning */}
              {fromKasId && toKasId && fromKasId === toKasId && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Kas sumber dan tujuan tidak boleh sama.
                </div>
              )}

              {/* Visual Arrow */}
              {fromKasId && toKasId && fromKasId !== toKasId && (
                <div className="flex items-center justify-center gap-3 py-2">
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    getLocationType(fromKasId) === "Tunai" ? "bg-green-100 text-green-700" :
                    getLocationType(fromKasId) === "Bank" ? "bg-blue-100 text-blue-700" :
                    "bg-indigo-100 text-indigo-700"
                  }`}>
                    {getLocationName(fromKasId)}
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <div className="w-8 h-[2px] bg-amber-300 rounded-full" />
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    getLocationType(toKasId) === "Tunai" ? "bg-green-100 text-green-700" :
                    getLocationType(toKasId) === "Bank" ? "bg-blue-100 text-blue-700" :
                    "bg-indigo-100 text-indigo-700"
                  }`}>
                    {getLocationName(toKasId)}
                  </div>
                </div>
              )}

              {/* Nominal */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Jumlah Transfer (Rp)
                </label>
                <input
                  required
                  type="text"
                  value={nominal ? Number(nominal).toLocaleString('id-ID') : ""}
                  onChange={handleNominalChange}
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-4 shadow-sm text-xl font-bold ${
                    isOverBalance
                      ? "border-red-300 focus:ring-red-500/20 focus:border-red-500 text-red-900 bg-red-50/30"
                      : "border-amber-300 focus:ring-amber-500/20 focus:border-amber-500 text-amber-900 bg-amber-50/30"
                  }`}
                  placeholder="0"
                />
                {isOverBalance && fromKasId && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Saldo kas sumber tidak mencukupi! Saldo tersedia: Rp {selectedFromBalance.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>

              {/* Description (optional) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Keterangan <span className="font-normal text-gray-400">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Pindah dana ke rekening bank untuk bayar listrik"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-gray-50/50"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`px-8 py-3 text-sm font-bold text-white rounded-xl transition-all shadow-lg ${
                    canSubmit
                      ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                      : "bg-gray-300 cursor-not-allowed shadow-none"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" />
                    Proses Transfer
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
