import { registerPlugin } from '@capacitor/core';
import type { ReceiptData } from '../components/ReceiptModal';

// Plugin native: android/app/src/main/java/id/arcomteknologi/jepunkas/BluetoothPrinterPlugin.java
interface BluetoothPrinterPlugin {
  listPairedDevices(): Promise<{ devices: PrinterDevice[] }>;
  print(options: { address: string; data: string }): Promise<void>;
}

export interface PrinterDevice {
  name: string;
  address: string;
}

export interface PrinterConfig {
  address: string;
  name: string;
  paperWidth: 58 | 80;
}

const BluetoothPrinter = registerPlugin<BluetoothPrinterPlugin>('BluetoothPrinter');
const CONFIG_KEY = 'printer_config_v1';

export const listPairedPrinters = async () => (await BluetoothPrinter.listPairedDevices()).devices;

export function getPrinterConfig(): PrinterConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as PrinterConfig) : null;
  } catch {
    return null;
  }
}

export const savePrinterConfig = (config: PrinterConfig) => localStorage.setItem(CONFIG_KEY, JSON.stringify(config));

// ---------------- ESC/POS ----------------
const ESC = 0x1b;
const GS = 0x1d;

class EscPos {
  private bytes: number[] = [];
  readonly cols: number;

  constructor(paperWidth: 58 | 80) {
    this.cols = paperWidth === 80 ? 48 : 32;
    this.bytes.push(ESC, 0x40); // reset printer
  }

  /** Printer thermal hanya paham ASCII dasar: buang aksen & ganti karakter lain. */
  private encode(text: string) {
    const ascii = text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[–—]/g, '-');
    for (const ch of ascii) {
      const code = ch.charCodeAt(0);
      this.bytes.push(code >= 0x20 && code < 0x7f ? code : 0x3f);
    }
  }

  align(mode: 'left' | 'center' | 'right') {
    this.bytes.push(ESC, 0x61, mode === 'left' ? 0 : mode === 'center' ? 1 : 2);
    return this;
  }

  bold(on: boolean) {
    this.bytes.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  /** Huruf tinggi ganda (lebar tetap) untuk judul & total. */
  doubleHeight(on: boolean) {
    this.bytes.push(GS, 0x21, on ? 0x01 : 0x00);
    return this;
  }

  line(text = '') {
    this.encode(text);
    this.bytes.push(0x0a);
    return this;
  }

  /** Teks panjang dipecah per kata sesuai lebar kertas. */
  wrap(text: string) {
    const words = text.split(/\s+/).filter(Boolean);
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= this.cols) {
        current = candidate;
      } else {
        if (current) this.line(current);
        // kata yang lebih panjang dari satu baris dipotong paksa
        let rest = word;
        while (rest.length > this.cols) {
          this.line(rest.slice(0, this.cols));
          rest = rest.slice(this.cols);
        }
        current = rest;
      }
    }
    if (current) this.line(current);
    return this;
  }

  /** Label di kiri, nilai di kanan; jika tidak muat, nilai turun ke baris berikutnya rata kanan. */
  pair(left: string, right: string) {
    const gap = this.cols - left.length - right.length;
    if (gap >= 1) return this.line(left + ' '.repeat(gap) + right);
    this.wrap(left);
    return this.line(right.length >= this.cols ? right : ' '.repeat(this.cols - right.length) + right);
  }

  divider() {
    return this.line('-'.repeat(this.cols));
  }

  feed(lines: number) {
    this.bytes.push(ESC, 0x64, lines);
    return this;
  }

  /** Potong kertas (diabaikan oleh printer tanpa cutter). */
  cut() {
    this.bytes.push(GS, 0x56, 0x42, 0x00);
    return this;
  }

  toBase64() {
    let binary = '';
    for (const b of this.bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }
}

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export function buildReceipt(data: ReceiptData, settings: Record<string, string>, paperWidth: 58 | 80) {
  const p = new EscPos(paperWidth);
  const date = new Date(data.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: '2-digit' });

  p.align('center').bold(true).doubleHeight(true)
    .wrap((settings['nama_organisasi'] || settings['rt_name'] || 'Organisasi Warga').toUpperCase())
    .doubleHeight(false).bold(false);
  if (settings['nama_desa']) p.wrap(settings['nama_desa']);
  if (settings['alamat']) p.wrap(settings['alamat']);
  p.line('BUKTI PEMBAYARAN');

  p.align('left').divider()
    .pair('Tanggal', date)
    .pair('No. Ref', data.transactionId)
    .bold(true).wrap(`Warga: ${data.residentName.toUpperCase()} (${data.residentBlock})`).bold(false)
    .divider()
    .line('RINCIAN PEMBAYARAN:');

  for (const item of data.items) {
    p.wrap(item.title).align('right').line(rupiah(item.subTotal)).align('left');
  }

  p.divider().bold(true).doubleHeight(true).pair('TOTAL', rupiah(data.total)).doubleHeight(false).bold(false).divider();

  p.align('center')
    .wrap('Simpan struk ini sebagai bukti pembayaran yang sah.')
    .wrap('Terima kasih atas partisipasi Anda.')
    .wrap(`-- Diterima Kas: ${data.kasName} --`)
    .feed(4)
    .cut();

  return p.toBase64();
}

export async function printReceipt(data: ReceiptData, settings: Record<string, string>, config: PrinterConfig) {
  await BluetoothPrinter.print({ address: config.address, data: buildReceipt(data, settings, config.paperWidth) });
}
