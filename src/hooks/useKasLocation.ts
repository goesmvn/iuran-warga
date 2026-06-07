import { useState, useEffect } from 'react';
import type { KasLocation } from '../types';
import { apiFetch } from '../utils/apiFetch';
import { useConfirm } from '../contexts/ConfirmContext';

export const DEFAULT_KAS_LOCATION_ID = 'loc-default'; // Matched with DB seed id

export function useKasLocation() {
    const [locations, setLocations] = useState<KasLocation[]>([]);
    const { alert: customAlert } = useConfirm();

    useEffect(() => {
        apiFetch('/api/kas-locations')
            .then(res => res.json())
            .then(data => setLocations(data))
            .catch(err => console.error("Failed to fetch kas locations:", err));
    }, []);

    const addLocation = async (newLoc: Omit<KasLocation, 'id'>) => {
        const id = `loc-${Date.now()}`;
        const payload = { ...newLoc, id };
        setLocations(prev => [...prev, payload]);
        await apiFetch('/api/kas-locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    };

    const updateLocation = async (id: string, updatedData: Partial<KasLocation>) => {
        setLocations(prev => prev.map(l => l.id === id ? { ...l, ...updatedData } as KasLocation : l));
        await apiFetch(`/api/kas-locations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
    };

    const deleteLocation = async (id: string) => {
        if (id === DEFAULT_KAS_LOCATION_ID) {
            await customAlert('Aksi Dilarang', 'Lokasi Kas default tidak bisa dihapus.', 'warning');
            return;
        }
        const prevLocations = [...locations];
        setLocations(prev => prev.filter(l => l.id !== id));
        try {
            const res = await apiFetch(`/api/kas-locations/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                await customAlert('Hapus Lokasi Kas Gagal', data.error || 'Gagal menghapus lokasi kas.', 'error');
                setLocations(prevLocations);
            }
        } catch {
            await customAlert('Koneksi Gagal', 'Gagal menghapus lokasi kas. Periksa koneksi Anda.', 'error');
            setLocations(prevLocations);
        }
    };

    return { locations, addLocation, updateLocation, deleteLocation };
}
