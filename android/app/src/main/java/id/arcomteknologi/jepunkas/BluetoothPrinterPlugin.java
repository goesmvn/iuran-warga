package id.arcomteknologi.jepunkas;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

/**
 * Cetak ke printer thermal Bluetooth Classic (SPP) memakai perintah ESC/POS mentah.
 * Printer harus sudah di-pair lewat Pengaturan Bluetooth Android.
 */
@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = { @Permission(alias = "bluetooth", strings = { Manifest.permission.BLUETOOTH_CONNECT }) }
)
public class BluetoothPrinterPlugin extends Plugin {

    // UUID standar Serial Port Profile, dipakai hampir semua printer thermal
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private BluetoothAdapter getAdapter() {
        BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return manager != null ? manager.getAdapter() : null;
    }

    /** Android 12+ butuh izin BLUETOOTH_CONNECT saat runtime; versi lama cukup izin di manifest. */
    private boolean needsPermission() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && getPermissionState("bluetooth") != PermissionState.GRANTED;
    }

    @PluginMethod
    public void listPairedDevices(PluginCall call) {
        if (needsPermission()) {
            requestPermissionForAlias("bluetooth", call, "listPermissionCallback");
            return;
        }
        doListPairedDevices(call);
    }

    @PermissionCallback
    private void listPermissionCallback(PluginCall call) {
        if (needsPermission()) {
            call.reject("Izin Bluetooth ditolak.");
            return;
        }
        doListPairedDevices(call);
    }

    @SuppressLint("MissingPermission")
    private void doListPairedDevices(PluginCall call) {
        BluetoothAdapter adapter = getAdapter();
        if (adapter == null) {
            call.reject("Perangkat ini tidak mendukung Bluetooth.");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("Bluetooth mati. Nyalakan Bluetooth terlebih dahulu.");
            return;
        }

        JSArray devices = new JSArray();
        Set<BluetoothDevice> bonded = adapter.getBondedDevices();
        for (BluetoothDevice device : bonded) {
            JSObject item = new JSObject();
            item.put("name", device.getName() != null ? device.getName() : device.getAddress());
            item.put("address", device.getAddress());
            devices.put(item);
        }
        JSObject result = new JSObject();
        result.put("devices", devices);
        call.resolve(result);
    }

    @PluginMethod
    public void print(PluginCall call) {
        if (needsPermission()) {
            requestPermissionForAlias("bluetooth", call, "printPermissionCallback");
            return;
        }
        doPrint(call);
    }

    @PermissionCallback
    private void printPermissionCallback(PluginCall call) {
        if (needsPermission()) {
            call.reject("Izin Bluetooth ditolak.");
            return;
        }
        doPrint(call);
    }

    @SuppressLint("MissingPermission")
    private void doPrint(PluginCall call) {
        String address = call.getString("address");
        String base64Data = call.getString("data");
        if (address == null || base64Data == null) {
            call.reject("Alamat printer dan data cetak wajib diisi.");
            return;
        }

        BluetoothAdapter adapter = getAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("Bluetooth mati. Nyalakan Bluetooth terlebih dahulu.");
            return;
        }

        byte[] data = Base64.decode(base64Data, Base64.DEFAULT);

        // Koneksi Bluetooth bersifat blocking, jangan jalankan di UI thread
        new Thread(() -> {
            BluetoothSocket socket = null;
            try {
                BluetoothDevice device = adapter.getRemoteDevice(address);
                stopDiscoveryIfAllowed(adapter);
                try {
                    socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                    socket.connect();
                } catch (IOException secureFailed) {
                    // Sebagian printer murah hanya menerima koneksi insecure
                    closeQuietly(socket);
                    socket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID);
                    socket.connect();
                }

                OutputStream out = socket.getOutputStream();
                out.write(data);
                out.flush();
                // Beri waktu buffer printer menerima data sebelum koneksi ditutup
                Thread.sleep(800);
                call.resolve();
            } catch (Exception e) {
                call.reject("Gagal mencetak: pastikan printer menyala dan dalam jangkauan. (" + e.getMessage() + ")");
            } finally {
                closeQuietly(socket);
            }
        }).start();
    }

    /**
     * Pencarian perangkat yang sedang berjalan memperlambat koneksi, jadi dihentikan bila boleh.
     * Di Android 12+ cancelDiscovery() butuh izin BLUETOOTH_SCAN yang tidak diminta aplikasi ini
     * (aplikasi tidak pernah memindai); tanpa pengecekan ini SEMUA cetakan gagal dengan SecurityException.
     */
    @SuppressLint("MissingPermission")
    private void stopDiscoveryIfAllowed(BluetoothAdapter adapter) {
        boolean allowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S
            || getContext().checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;
        if (!allowed) return;
        try {
            adapter.cancelDiscovery();
        } catch (SecurityException ignored) {
            // tidak kritis untuk mencetak
        }
    }

    private static void closeQuietly(BluetoothSocket socket) {
        if (socket == null) return;
        try {
            socket.close();
        } catch (IOException ignored) {
            // sudah tertutup
        }
    }
}
