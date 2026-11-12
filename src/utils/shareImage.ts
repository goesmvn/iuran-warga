import { toPng } from 'html-to-image';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Ubah elemen di layar (mis. kwitansi) menjadi gambar PNG lalu bagikan
 * lewat menu Share Android (WhatsApp, dsb). Di browser: Web Share API, atau unduh jika tidak didukung.
 */
export async function shareElementAsImage(element: HTMLElement, fileName: string, text: string) {
  // skipFonts: jangan unduh web font saat render, agar tetap jalan saat offline
  // Elemen bertanda data-share-ignore (mis. tombol pilihan tampilan) tidak ikut masuk ke gambar
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    skipFonts: true,
    filter: (node) => !(node instanceof HTMLElement && node.dataset.shareIgnore !== undefined),
  });

  if (Capacitor.isNativePlatform()) {
    const file = await Filesystem.writeFile({
      path: fileName,
      data: dataUrl.split(',')[1],
      directory: Directory.Cache,
    });
    try {
      await Share.share({ title: text, text, files: [file.uri], dialogTitle: 'Bagikan Bukti Pembayaran' });
    } catch (err) {
      // Pengguna menutup menu share: bukan error
      if (err instanceof Error && /cancel/i.test(err.message)) return;
      throw err;
    }
    return;
  }

  const blob = await (await fetch(dataUrl)).blob();
  const shareFile = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [shareFile] })) {
    try {
      await navigator.share({ files: [shareFile], title: text, text });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      throw err;
    }
    return;
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

/** Nama file aman: huruf/angka saja. */
export const safeFileName = (...parts: string[]) =>
  parts.join('_').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').slice(0, 80) + '.png';

/**
 * Simpan / bagikan file teks (mis. CSV untuk Excel). Di Android unduhan biasa diblokir WebView,
 * jadi file dibagikan lewat menu Share (WhatsApp, Drive, email, dsb). Di browser: unduh biasa.
 */
export async function shareTextFile(fileName: string, content: string, mimeType: string, title: string) {
  if (Capacitor.isNativePlatform()) {
    const file = await Filesystem.writeFile({ path: fileName, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title, text: title, files: [file.uri], dialogTitle: title });
    } catch (err) {
      if (err instanceof Error && /cancel/i.test(err.message)) return;
      throw err;
    }
    return;
  }
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
