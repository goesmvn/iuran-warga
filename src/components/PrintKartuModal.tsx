import { useState, useMemo } from "react";
import { X, Printer, Check } from "lucide-react";
import { useTransaksi } from "../hooks/useTransaksi";
import { useCategory } from "../hooks/useCategory";
import { useSettings } from "../hooks/useSettings";
import { JepunIcon } from "./JepunIcon";
import type { Resident } from "../types";

interface PrintKartuModalProps {
  isOpen: boolean;
  onClose: () => void;
  warga: Resident | null;
}

export function PrintKartuModal({ isOpen, onClose, warga }: PrintKartuModalProps) {
  const { transactions } = useTransaksi();
  const { categories } = useCategory();
  const { settings } = useSettings();
  const namaBendahara = settings['nama_bendahara'] || '.......................................';
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isThermal, setIsThermal] = useState(false);
  const yearOptions = Array.from({length: 7}, (_, i) => currentYear - 2 + i);

  const bulananCids = useMemo(() => categories.filter(c => c.name.toLowerCase().includes("bulanan") || c.periode === "Bulanan").map(c => c.id), [categories]);
  const tahunanCids = useMemo(() => categories.filter(c => c.name.toLowerCase().includes("tahunan") || c.periode === "Tahunan").map(c => c.id), [categories]);

  const residentTx = useMemo(() => {
     if (!warga) return [];
     return transactions.filter(t => t.residentId === warga.id && t.type === "Pemasukan");
  }, [transactions, warga]);

  const paidMonths = useMemo(() => {
     const set = new Set<number>();
     residentTx.forEach(t => {
         if (t.periodeTahun === selectedYear) {
             if (t.periodeBulan && bulananCids.includes(t.categoryId)) {
                 set.add(t.periodeBulan);
             }
             if (tahunanCids.includes(t.categoryId)) {
                 for (let i = 1; i <= 12; i++) {
                     set.add(i);
                 }
             }
         }
     });
     return set;
  }, [residentTx, selectedYear, bulananCids, tahunanCids]);

  const incidentalTx = useMemo(() => {
     return residentTx.filter(t => 
         new Date(t.date).getFullYear() === selectedYear && 
         !bulananCids.includes(t.categoryId) && 
         !tahunanCids.includes(t.categoryId) &&
         t.categoryId !== 'cat-saldo-awal'
     );
  }, [residentTx, selectedYear, bulananCids, tahunanCids]);

  if (!isOpen || !warga) return null;

  const handlePrintA4 = () => {
      setIsThermal(false);
      setTimeout(() => window.print(), 100);
  };

  const handlePrintThermal = () => {
      setIsThermal(true);
      setTimeout(() => {
         window.print();
         setIsThermal(false); // Reset back after print dialog closes
      }, 100);
  };

  const monthsList = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  return (
    <>
      {isThermal && (
        <style type="text/css" media="print">
          {`
            @page { margin: 0; }
            body { 
              margin: 0 !important; 
              padding: 0 !important; 
            }
          `}
        </style>
      )}
      <div className="fixed inset-0 z-50 flex justify-center items-center p-4 print:p-0 print:block print:relative print:z-auto">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm print:hidden" onClick={onClose}></div>

        {/* Modal / Paper */}
        <div className={`bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl relative z-10 flex flex-col print:shadow-none print:m-0 print:border-none print:rounded-none ${isThermal ? 'print:w-full print:max-w-full overflow-y-auto print:overflow-visible' : 'overflow-hidden print:w-[210mm] print:h-[297mm] print:max-w-none'}`}>
         
         {/* Web Header */}
         <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 print:hidden hidden sm:flex">
             <div className="flex items-center gap-3">
                 <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="px-3 py-1.5 rounded-lg border border-gray-300 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm">
                    {yearOptions.map((y) => <option key={y} value={y}>Tahun {y}</option>)}
                 </select>
                 <span className="text-gray-500 text-sm">Pilih tahun untuk dicetak</span>
             </div>
             <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
             </button>
         </div>

         {/* Mobile close */}
         <button onClick={onClose} className="absolute top-4 right-4 print:hidden sm:hidden bg-white/50 p-1.5 rounded-full backdrop-blur-md border border-gray-200 z-20">
             <X className="w-5 h-5 text-gray-500" />
         </button>
         
         {/* Mobile Year Selector */}
         <div className="p-4 border-b border-gray-100 sm:hidden print:hidden flex items-center justify-between">
            <span className="font-bold text-sm">Pilih Tahun</span>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="px-3 py-1 rounded bg-gray-100">
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
         </div>

         {/* Printable Area */}
         <div className={`flex-1 ${isThermal ? 'print:overflow-visible p-6 sm:p-8 print:p-2' : 'overflow-y-auto print:overflow-visible p-8 sm:p-10 print:p-12'} text-gray-900 bg-white`}>
            
            {/* Kop Surat */}
            <div className={`flex items-center justify-between border-b-2 border-gray-800 ${isThermal ? 'pb-4 mb-6' : 'pb-6 mb-8'}`}>
               <div className={`flex items-center ${isThermal ? 'gap-3' : 'gap-6'}`}>
                  <div className={`grayscale brightness-0 print:grayscale-0 print:brightness-100 ${isThermal ? 'w-10 h-10' : 'w-20 h-20'}`}>
                     <JepunIcon className="w-full h-full" />
                  </div>
                  <div>
                     <h1 className={`${isThermal ? 'text-lg' : 'text-2xl'} font-black uppercase tracking-widest text-gray-900`}>{settings['nama_organisasi'] || settings['rt_name'] || 'Organisasi Warga'}</h1>
                     {settings['nama_desa'] && (
                       <p className={`${isThermal ? 'text-[10px]' : 'text-xs'} font-medium text-gray-600`}>{settings['nama_desa']}</p>
                     )}
                     {settings['alamat'] && !isThermal && (
                       <p className="text-[11px] text-gray-500 mt-0.5 leading-snug max-w-xs">{settings['alamat']}</p>
                     )}
                     {!settings['nama_organisasi'] && !settings['nama_desa'] && (
                       <p className={`${isThermal ? 'text-xs' : 'text-base font-medium'} text-gray-600`}>Buku Kontrol Kas & Iuran Warga</p>
                     )}
                  </div>
               </div>
               {!isThermal && (
                 <div className="text-right border-l-2 border-gray-300 pl-6 py-2">
                    <p className="text-xs uppercase tracking-widest font-bold text-gray-400">Tahun Buku</p>
                    <p className="text-3xl font-black text-gray-900">{selectedYear}</p>
                 </div>
               )}
               {isThermal && (
                 <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Thn Buku</p>
                    <p className="text-lg font-black text-gray-900">{selectedYear}</p>
                 </div>
               )}
            </div>

            {/* Identitas Warga */}
            <div className={`bg-gray-50/80 print:bg-transparent border-2 border-gray-200 print:border-gray-800 rounded-xl ${isThermal ? 'p-4 mb-6 text-sm' : 'p-6 mb-8 flex flex-wrap gap-x-12 gap-y-4'}`}>
                <div className={`${isThermal ? 'mb-2' : ''}`}>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Nama Kepala Keluarga</p>
                   <p className={`font-bold uppercase tracking-wide ${isThermal ? 'text-base' : 'text-xl'}`}>{warga.namaKepalaKeluarga}</p>
                </div>
                <div className={`${isThermal ? 'mb-2' : ''}`}>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Blok / Nomor Rumah</p>
                   <p className={`font-bold uppercase tracking-wide ${isThermal ? 'text-base' : 'text-xl'}`}>{warga.nomorRumah}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Status Keanggotaan</p>
                   <p className={`font-bold uppercase tracking-wide ${warga.status === 'Aktif' ? 'text-green-700 print:text-gray-900' : 'text-gray-500'} ${isThermal ? 'text-base' : 'text-lg'}`}>{warga.status}</p>
                </div>
            </div>

            {/* Matrix Bulanan */}
            <div className={`mb-8 break-inside-avoid ${isThermal ? 'text-xs' : ''}`}>
               <h3 className={`font-black uppercase tracking-widest text-gray-800 mb-4 flex items-center gap-2 ${isThermal ? 'text-xs' : 'text-sm'}`}><span className="w-4 h-4 rounded-sm bg-gray-800 inline-block"></span> IURAN POKOK BULANAN</h3>
               <div className={`grid ${isThermal ? 'grid-cols-2 print:grid-cols-2' : 'grid-cols-3 sm:grid-cols-4 print:grid-cols-4'} gap-0 border-t-2 border-l-2 border-gray-800`}>
                   {monthsList.map((month, idx) => {
                       const mNum = idx + 1;
                       const isPaid = paidMonths.has(mNum);
                       return (
                          <div key={month} className={`border-b-2 border-r-2 border-gray-800 p-3 h-24 flex flex-col justify-between ${isPaid ? 'bg-gray-50 print:bg-transparent' : 'bg-white'}`}>
                              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{month}</span>
                              <div className="flex-1 flex items-center justify-center">
                                  {isPaid ? (
                                      <Check className={`${isThermal ? 'w-5 h-5' : 'w-8 h-8'} text-gray-800 print:text-black`} />
                                  ) : (
                                      <span className={`text-gray-300 print:text-gray-300 ${isThermal ? 'text-xl' : 'text-3xl'} font-light`}>-</span>
                                  )}
                              </div>
                              <div className="text-right">
                                  {isPaid ? (
                                      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-800 border border-gray-800 px-1.5 py-0.5 rounded-sm">LUNAS</span>
                                  ) : null}
                              </div>
                          </div>
                       )
                   })}
               </div>
            </div>

            {/* Incidental */}
            <div className={`break-inside-avoid ${isThermal ? 'mb-6 text-xs' : 'mb-12'}`}>
               <h3 className={`font-black uppercase tracking-widest text-gray-800 mb-4 flex items-center gap-2 ${isThermal ? 'text-xs' : 'text-sm'}`}><span className="w-4 h-4 rounded-sm bg-gray-400 inline-block"></span> IURAN INSIDENTAL / LAINNYA</h3>
               <table className="w-full text-sm text-left border-2 border-gray-800">
                  <thead className={`bg-gray-100 print:bg-transparent font-bold text-gray-800 uppercase tracking-wider border-b-2 border-gray-800 ${isThermal ? 'text-[10px]' : 'text-xs'}`}>
                     <tr>
                        <th className={`px-2 py-2 border-r-2 border-gray-800 ${isThermal ? 'w-1/3' : 'w-1/4'}`}>Tanggal/Ket</th>
                        {!isThermal && <th className="px-4 py-3 border-r-2 border-gray-800">Keterangan</th>}
                        <th className={`px-2 py-2 text-right ${isThermal ? 'w-2/3' : ''}`}>Nominal</th>
                     </tr>
                  </thead>
                  <tbody className={isThermal ? 'text-xs' : ''}>
                     {incidentalTx.length > 0 ? incidentalTx.map(t => (
                        <tr key={t.id} className="border-b-2 border-gray-800 last:border-0 hover:bg-gray-50">
                           <td className="px-2 py-2 border-r-2 border-gray-800 font-medium">
                              {new Date(t.date).toLocaleDateString("id-ID")}
                              {isThermal && <div className="text-[10px] text-gray-500 mt-1">{categories.find(c => c.id === t.categoryId)?.name || t.description}</div>}
                           </td>
                           {!isThermal && <td className="px-4 py-3 border-r-2 border-gray-800 font-medium">{categories.find(c => c.id === t.categoryId)?.name || t.description}</td>}
                           <td className="px-2 py-2 font-bold text-right text-gray-900">Rp {t.nominal.toLocaleString("id-ID")}</td>
                        </tr>
                     )) : (
                        <tr>
                           <td colSpan={3} className="px-4 py-6 text-center text-gray-500 font-medium italic">Tidak ada catatan iuran lain atau tunggakan dibayar tahun ini.</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>

            {/* TTd */}
            <div className={`grid ${isThermal ? 'grid-cols-1' : 'grid-cols-2'} text-center font-medium ${isThermal ? 'mt-8 text-xs' : 'mt-12 text-sm'} break-inside-avoid`}>
               {!isThermal && <div></div>}
               <div>
                  <p>Denpasar, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                  <p className={isThermal ? 'mb-12' : 'mb-20'}>Pengurus Kas / Bendahara</p>
                  <p className="font-bold underline uppercase pt-2">{namaBendahara}</p>
               </div>
            </div>

         </div>

         {/* Web Footer Actions (No Print) */}
         <div className="p-4 border-t border-gray-100 bg-white print:hidden flex justify-end gap-3 rounded-b-2xl flex-wrap">
             <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Tutup</button>
             <button onClick={handlePrintThermal} className="px-6 py-2.5 rounded-xl font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 shadow-sm flex items-center gap-2 transition-transform active:scale-95">
                 <Printer className="w-4 h-4" /> Cetak Thermal BT
             </button>
             <button onClick={handlePrintA4} className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 flex items-center gap-2 transition-transform active:scale-95">
                 <Printer className="w-4 h-4" /> Cetak A4 Standard
             </button>
         </div>

      </div>
    </div>
    </>
  );
}
