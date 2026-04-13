import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiFetch';

export function useSettings() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    const fetchSettings = () => {
        setLoading(true);
        apiFetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                setSettings(data);
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
