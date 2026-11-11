import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { dismissFailed, flushQueue, getSyncStatus, retryFailed, subscribeSync, type SyncStatus as Status } from "../utils/offlineSync";

const describe = (method: string, url: string) => {
    const action = method === "POST" ? "Tambah" : method === "PUT" ? "Ubah" : "Hapus";
    const target = url.split("/")[2] || url;
    return `${action} ${target}`;
};

export function SyncStatus() {
    const [status, setStatus] = useState<Status>(getSyncStatus);
    const [open, setOpen] = useState(false);

    useEffect(() => subscribeSync(setStatus), []);

    const hasFailed = status.failed.length > 0;
    let icon = <CheckCircle2 className="w-4 h-4" />;
    let label = "Tersinkron";
    let tone = "text-green-700 bg-green-50 border-green-200";

    if (!status.online) {
        icon = <CloudOff className="w-4 h-4" />;
        label = status.pending > 0 ? `Offline · ${status.pending} menunggu` : "Offline";
        tone = "text-gray-700 bg-gray-100 border-gray-200";
    } else if (status.authExpired) {
        icon = <AlertTriangle className="w-4 h-4" />;
        label = `Login ulang · ${status.pending} menunggu`;
        tone = "text-orange-700 bg-orange-50 border-orange-200";
    } else if (status.syncing || status.pending > 0) {
        icon = <RefreshCw className={`w-4 h-4 ${status.syncing ? "animate-spin" : ""}`} />;
        label = `Sinkron ${status.pending}...`;
        tone = "text-blue-700 bg-blue-50 border-blue-200";
    }

    if (hasFailed) {
        tone = "text-red-700 bg-red-50 border-red-200";
        label = `${label} · ${status.failed.length} gagal`;
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => { setOpen(o => !o); flushQueue(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${tone}`}
            >
                {hasFailed ? <AlertTriangle className="w-4 h-4" /> : icon}
                <span className="whitespace-nowrap">{label}</span>
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4 text-sm">
                    <div className="flex justify-between items-center mb-2">
                        <p className="font-bold text-gray-800">Status Sinkronisasi</p>
                        <button type="button" onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                    </div>
                    <p className="text-gray-600">
                        {status.online ? "Online" : "Offline — catatan disimpan di HP dan dikirim otomatis saat online."}
                    </p>
                    <p className="text-gray-600 mt-1">Menunggu dikirim: <b>{status.pending}</b></p>
                    {status.authExpired && (
                        <p className="text-orange-700 mt-2">Sesi login habis. Login ulang untuk melanjutkan pengiriman; catatan tidak hilang.</p>
                    )}
                    {hasFailed && (
                        <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                            <p className="font-bold text-red-700">Ditolak server (tidak tersimpan):</p>
                            {status.failed.map(f => (
                                <div key={f.qid} className="bg-red-50 rounded-lg p-2 flex justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-gray-800">{describe(f.method, f.url)}</p>
                                        <p className="text-xs text-red-700">{f.error}</p>
                                        <p className="text-[10px] text-gray-500">{new Date(f.createdAt).toLocaleString("id-ID")}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 self-start">
                                        <button type="button" onClick={() => retryFailed(f.qid)} className="text-xs font-bold text-blue-600 hover:text-blue-800">Coba lagi</button>
                                        <button type="button" onClick={() => dismissFailed(f.qid)} className="text-xs font-bold text-gray-500 hover:text-gray-800">Tutup</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
