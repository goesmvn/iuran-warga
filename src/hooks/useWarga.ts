import { useState, useEffect } from 'react';
import type { Resident } from '../types';
import { DEFAULT_WARGA } from '../utils/constants';
import { apiFetch } from '../utils/apiFetch';

export function useWarga() {
    const [warga, setWarga] = useState<Resident[]>([]);

    const fetchWarga = async () => {
        try {
            const res = await apiFetch('/api/warga');
            const data = await res.json();
            
            if (data.length === 0 && DEFAULT_WARGA.length > 0 && !localStorage.getItem('warga_seeded')) {
                localStorage.setItem('warga_seeded', 'true');
                // Auto-seed database on first empty run
                const seedData = DEFAULT_WARGA.map((w, index) => ({...w, id: `warga-${Date.now()}-${index}`})) as Resident[];
                
                await Promise.all(seedData.map(w =>
                    apiFetch('/api/warga', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(w)
                    })
                ));
                setWarga(seedData);
            } else {
                setWarga(data);
            }
        } catch (err) {
            console.error("Failed to fetch warga:", err);
        }
    };

    useEffect(() => {
        fetchWarga();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const addWarga = async (newWarga: Omit<Resident, 'id'>) => {
        const id = `warga-${Date.now()}`;
        const payload = { ...newWarga, id };
        
        setWarga(prev => [...prev, payload]); // Optimistic update
        
        try {
            await apiFetch('/api/warga', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error("Failed to add Warga. Rolling back UI.", err);
            setWarga(prev => prev.filter(w => w.id !== id)); // Rollback addition
            throw err;
        }
    };

    const updateWarga = async (id: string, updatedData: Partial<Resident>) => {
        const originalWarga = warga.find(w => w.id === id);
        
        setWarga(prev => prev.map(w => w.id === id ? { ...w, ...updatedData } as Resident : w)); // Optimistic
        
        try {
            await apiFetch(`/api/warga/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
        } catch (err) {
            console.error("Failed to update Warga. Rolling back UI.", err);
            if (originalWarga) {
                 setWarga(prev => prev.map(w => w.id === id ? originalWarga : w)); // Rollback edit
            } else {
                 fetchWarga(); // Fallback sync
            }
            throw err;
        }
    };

    const deleteWarga = async (id: string) => {
        const targetWarga = warga.find(w => w.id === id);
        
        setWarga(prev => prev.filter(w => w.id !== id)); // Optimistic
        
        try {
            const res = await apiFetch(`/api/warga/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Gagal menghapus warga.');
                if (targetWarga) {
                    setWarga(prev => [...prev, targetWarga]);
                } else {
                    fetchWarga();
                }
            }
        } catch (err) {
            console.error("Failed to delete Warga. Rolling back UI.", err);
            if (targetWarga) {
                setWarga(prev => [...prev, targetWarga]); // Rollback deletion
            } else {
                fetchWarga(); // Fallback sync
            }
            throw err;
        }
    };

    const importWarga = async (importedWarga: Omit<Resident, 'id'>[]) => {
        const withIds = importedWarga.map(w => ({ ...w, id: `warga-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` }));
        
        setWarga(prev => [...prev, ...withIds]); // Optimistic
        
        try {
            await Promise.all(withIds.map(w => 
                apiFetch('/api/warga', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(w)
                })
            ));
        } catch (err) {
            console.error("Failed to import Warga. Resyncing via fetch.", err);
            fetchWarga(); // Batch rollback is complex, safer to auto-resync
            throw err;
        }
    };

    return { warga, addWarga, updateWarga, deleteWarga, importWarga };
}
