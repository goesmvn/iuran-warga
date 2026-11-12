import { useState } from "react";
import { Bluetooth, X } from "lucide-react";
import { getPrinterConfig, listPairedPrinters, printRaw, savePrinterConfig, type PrinterConfig, type PrinterDevice } from "../utils/bluetoothPrinter";

interface BluetoothPrintButtonProps {
  /** Susun data ESC/POS (base64) sesuai lebar kertas printer yang dipilih. */
  build: (paperWidth: 58 | 80) => string;
  label?: string;
  className?: string;
}

/**
 * Tombol cetak ke printer thermal Bluetooth (khusus aplikasi Android).
 * Saat pertama dipakai, pengguna memilih printer yang sudah di-pair & lebar kertas; pilihan diingat.
 */
export function BluetoothPrintButton({ build, label = "Cetak ke Printer Bluetooth", className = "" }: BluetoothPrintButtonProps) {
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(getPrinterConfig);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [paperWidth, setPaperWidth] = useState<58 | 80>(printerConfig?.paperWidth ?? 58);
  const [printStatus, setPrintStatus] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

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
      await printRaw(config, build(config.paperWidth));
      setPrintStatus({ type: "success", text: "Berhasil dicetak." });
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

  return (
    <div className="space-y-3 w-full">
      {pickerOpen && (
        <div className="border border-gray-200 rounded-xl p-3 space-y-3 text-sm text-left">
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
        type="button"
        onClick={() => (printerConfig ? printTo(printerConfig) : openPicker())}
        disabled={busy}
        className={`w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg ${className}`}
      >
        <Bluetooth className="w-5 h-5" /> {busy ? "Mencetak..." : label}
      </button>

      {printerConfig && !pickerOpen && (
        <button type="button" onClick={openPicker} className="w-full text-xs text-gray-500 hover:text-gray-800">
          Printer: <b>{printerConfig.name}</b> ({printerConfig.paperWidth}mm) · Ganti
        </button>
      )}
    </div>
  );
}
