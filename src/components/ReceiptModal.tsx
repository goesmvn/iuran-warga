import { useState } from "react";
import { Printer, X, Bluetooth } from "lucide-react";
import { JepunIcon } from "./JepunIcon";
import { useSettings } from "../hooks/useSettings";
import { isNativeApp } from "../utils/apiFetch";
import { getPrinterConfig, listPairedPrinters, printReceipt, savePrinterConfig, type PrinterConfig, type PrinterDevice } from "../utils/bluetoothPrinter";

type ReceiptItem = {
  title: string;
  subTotal: number;
};

export type ReceiptData = {
  date: string;
  residentName: string;
  residentBlock: string;
  items: ReceiptItem[];
  total: number;
  kasName: string;
  transactionId: string;
};

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

export function ReceiptModal({ isOpen, onClose, data }: ReceiptModalProps) {
  const { settings } = useSettings();
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(getPrinterConfig);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [paperWidth, setPaperWidth] = useState<58 | 80>(printerConfig?.paperWidth ?? 58);
  const [printStatus, setPrintStatus] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen || !data) return null;

  const openPicker = async () => {
    setPrintStatus(null);
    setPickerOpen(true);
    try {
      setDevices(await listPairedPrinters());
    } catch (err) {
      setPrintStatus({ type: "error", text: err instanceof Error ? err.message : "Gagal membaca daftar Bluetooth." });
    }
  };

  const printTo = async (config: PrinterConfig) => {
    setBusy(true);
    setPrintStatus({ type: "info", text: `Mencetak ke ${config.name}...` });
    try {
      await printReceipt(data, settings, config);
      setPrintStatus({ type: "success", text: "Struk berhasil dicetak." });
    } catch (err) {
      setPrintStatus({ type: "error", text: err instanceof Error ? err.message : "Gagal mencetak." });
    } finally {
      setBusy(false);
    }
  };

  const selectPrinter = (device: PrinterDevice) => {
    const config: PrinterConfig = { address: device.address, name: device.name, paperWidth };
    savePrinterConfig(config);
    setPrinterConfig(config);
    setPickerOpen(false);
    printTo(config);
  };

  const handlePrint = () => {
    if (!isNativeApp) {
      window.print();
      return;
    }
    if (printerConfig) printTo(printerConfig);
    else openPicker();
  };

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { margin: 0; }
          body { 
            margin: 0 !important; 
            padding: 0 !important; 
          }
        `}
      </style>
      <div className="fixed inset-0 z-50 flex justify-center items-center p-4 print:p-0 print:block print:relative print:z-auto">
        {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm print:hidden"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-full print:m-0 print:border-none print:rounded-none">
        
        {/* Header Actions (No Print) */}
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 print:hidden hidden sm:flex">
          <h3 className="font-bold text-gray-800">Bukti Pembayaran</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Mobile quick close button */}
        <button onClick={onClose} className="absolute top-4 right-4 print:hidden sm:hidden bg-white/50 p-1.5 rounded-full backdrop-blur-md border border-gray-200">
           <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto print:overflow-visible">
          <div className="p-6 sm:p-8 print:p-0 bg-white text-gray-900 font-mono text-[13px] print:text-[11px] leading-relaxed">
            
            {/* Header Struk */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-3 opacity-95 flex items-center justify-center bg-gray-900 rounded-full p-1.5 print:bg-transparent print:p-0">
                 <JepunIcon className="w-full h-full text-white print:text-gray-900" />
              </div>
              <h2 className="font-bold text-base print:text-sm uppercase tracking-widest">{settings['nama_organisasi'] || settings['rt_name'] || 'Organisasi Warga'}</h2>
              {settings['nama_desa'] && (
                <p className="text-gray-500 text-[11px] mt-0.5">{settings['nama_desa']}</p>
              )}
              {settings['alamat'] && (
                <p className="text-gray-500 text-[10px] mt-1 leading-snug">{settings['alamat']}</p>
              )}
              <div className="border-t border-dashed border-gray-400 my-4"></div>
            </div>

            {/* Info Transaksi */}
            <div className="mb-4 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500 whitespace-nowrap">Tanggal</span>
                <span className="font-semibold text-right">{new Date(data.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 whitespace-nowrap">No. Ref</span>
                <span className="font-semibold text-right">{data.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 whitespace-nowrap">Warga</span>
                <span className="font-bold text-right uppercase">{data.residentName} ({data.residentBlock})</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-400 my-4"></div>

            {/* Rincian Item */}
            <div className="mb-4">
              <p className="font-bold mb-2">RINCIAN PEMBAYARAN:</p>
              <div className="space-y-3">
                {data.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-3">
                    <span className="flex-1">{item.title}</span>
                    <span className="font-semibold whitespace-nowrap">Rp {item.subTotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-dashed border-gray-400 my-4"></div>

            {/* Total Area */}
            <div className="flex justify-between items-end mb-6">
              <span className="font-bold text-base">TOTAL</span>
              <span className="font-bold text-xl print:text-lg tracking-tight">Rp {data.total.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {/* Footer */}
            <div className="text-center text-gray-500 text-xs space-y-1.5">
              <p>Simpan struk ini sebagai bukti pembayaran yang sah.</p>
              <p>Terima kasih atas partisipasi Anda.</p>
              <p className="pt-2 text-[10px]">-- Diterima Kas: {data.kasName} --</p>
            </div>

          </div>
        </div>

        {/* Footer Actions (No Print) */}
        <div className="p-5 border-t border-gray-100 bg-white print:hidden space-y-3">
          {pickerOpen && (
            <div className="border border-gray-200 rounded-xl p-3 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-800">Pilih Printer Bluetooth</p>
                <button type="button" onClick={() => setPickerOpen(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-2">
                {([58, 80] as const).map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setPaperWidth(w)}
                    className={`flex-1 py-1.5 rounded-lg border font-bold ${paperWidth === w ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600"}`}
                  >
                    Kertas {w}mm
                  </button>
                ))}
              </div>
              {devices.length === 0 ? (
                <p className="text-gray-500 text-xs">Belum ada printer. Pair printer dulu di Pengaturan Bluetooth HP, lalu buka lagi daftar ini.</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {devices.map(d => (
                    <button
                      key={d.address}
                      type="button"
                      onClick={() => selectPrinter(d)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 border border-gray-100"
                    >
                      <p className="font-semibold text-gray-800">{d.name}</p>
                      <p className="text-[10px] text-gray-500">{d.address}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {printStatus && (
            <p className={`text-xs font-semibold text-center ${printStatus.type === "error" ? "text-red-600" : printStatus.type === "success" ? "text-green-600" : "text-gray-600"}`}>
              {printStatus.text}
            </p>
          )}

          <button
            onClick={handlePrint}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg"
          >
            {isNativeApp ? <Bluetooth className="w-5 h-5" /> : <Printer className="w-5 h-5" />} {busy ? "Mencetak..." : "Cetak Struk"}
          </button>

          {isNativeApp && printerConfig && !pickerOpen && (
            <button type="button" onClick={openPicker} className="w-full text-xs text-gray-500 hover:text-gray-800">
              Printer: <b>{printerConfig.name}</b> ({printerConfig.paperWidth}mm) · Ganti
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
