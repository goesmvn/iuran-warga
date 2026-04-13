import { useState, useEffect } from 'react';
import type { Resident } from '../types';
import { DEFAULT_WARGA } from '../utils/constants';
import { apiFetch } from '../utils/apiFetch';

export function useWarga() {
    const [warga, setWarga] = useState<Resident[]>([]);

    const fetchWarga = () => {
        apiFetch('/api/warga')
            .then(res => res.json())
            .then(data => {
                if (data.length === 0 && DEFAULT_WARGA.length > 0 && !localStorage.getItem('warga_seeded')) {
                    localStorage.setItem('warga_seeded', 'true');
                    // Auto-seed database on first empty run
                    const seedData = DEFAULT_WARGA.map((w, index) => ({...w, id: `warga-${Date.now()}-${index}`})) as Resident[];
                    Promise.all(seedData.map(w =>
                        apiFetch('/api/warga', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(w)
                        })
                    )).then(() => {
                        setWarga(seedData);
                    });
                } else {
                    setWarga(data);
                }
            })
            .catch(err => console.error("Failed to fetch warga:", err));
    };

    useEffect(() => {
        fetchWarga();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const addWarga = async (newWarga: Omit<Resident, 'id'>) => {
        const id = `warga-${Date.now()}`;
        const payload = { ...newWarga, id };
        setWarga(prev => [...prev, payload]); // Optimistic update
        await apiFetch('/api/warga', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    };

    const updateWarga = async (id: string, updatedData: Partial<Resident>) => {
        setWarga(prev => prev.map(w => w.id === id ? { ...w, ...updatedData } as Resident : w)); // Optimistic
        await apiFetch(`/api/warga/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
    };

    const deleteWarga = async (id: string) => {
        setWarga(prev => prev.filter(w => w.id !== id)); // Optimistic
        await apiFetch(`/api/warga/${id}`, { method: 'DELETE' });
    };

    const importWarga = async (importedWarga: Omit<Resident, 'id'>[]) => {
        const withIds = importedWarga.map(w => ({ ...w, id: `warga-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` }));
        setWarga(prev => [...prev, ...withIds]); // Optimistic
        await Promise.all(withIds.map(w => 
            apiFetch('/api/warga', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(w)
            })
        ));
    };

    return { warga, addWarga, updateWarga, deleteWarga, importWarga };
}
