import { Printer, X } from "lucide-react";
import { JepunIcon } from "./JepunIcon";
import { useSettings } from "../hooks/useSettings";

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
  
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
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
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-full print:m-0 print:border-none print:rounded-none">
        
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
              <div className="w-12 h-12 mx-auto mb-3 grayscale print:grayscale-0 opacity-80">
                 <JepunIcon className="w-full h-full" />
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
        <div className="p-5 border-t border-gray-100 bg-white print:hidden">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg"
          >
            <Printer className="w-5 h-5" /> Cetak Struk
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
