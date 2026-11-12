import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { cachedData } from '../utils/offlineSync';

export function useSettings() {
    // Tampil instan dari data terakhir di HP, lalu diperbarui dari server
    const [settings, setSettings] = useState<Record<string, string>>(() => cachedData<Record<string, string>>('/api/settings', {}));
    const [loading, setLoading] = useState(() => Object.keys(settings).length === 0);

    const fetchSettings = () => {
        setLoading(true);
        apiFetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data && typeof data === 'object' && !Array.isArray(data) && !data.error) setSettings(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch settings:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const updateSetting = async (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value })); // Optimistic update
        await apiFetch(`/api/settings/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value })
        });
    };

    return { settings, updateSetting, loading, refreshSettings: fetchSettings };
}
