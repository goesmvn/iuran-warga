import { useState, useEffect } from 'react';
import type { Category } from '../types';
import { apiFetch } from '../utils/apiFetch';
import { useConfirm } from '../contexts/ConfirmContext';

export function useCategory() {
    const [categories, setCategories] = useState<Category[]>([]);
    const { alert: customAlert } = useConfirm();

    useEffect(() => {
        apiFetch('/api/categories')
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error("Failed to fetch categories:", err));
    }, []);

    const addCategory = async (newCat: Omit<Category, 'id'>) => {
        const id = `cat-${Date.now()}`;
        const payload = { ...newCat, id };
        setCategories(prev => [...prev, payload]);
        await apiFetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    };

    const updateCategory = async (id: string, updatedData: Partial<Category>) => {
        setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updatedData } as Category : c));
        await apiFetch(`/api/categories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
    };

    const deleteCategory = async (id: string) => {
        const prevCategories = [...categories];
        setCategories(prev => prev.filter(c => c.id !== id));
        try {
            const res = await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                await customAlert('Hapus Kategori Gagal', data.error || 'Gagal menghapus kategori.', 'error');
                setCategories(prevCategories);
            }
        } catch {
            await customAlert('Koneksi Gagal', 'Gagal menghapus kategori. Periksa koneksi Anda.', 'error');
            setCategories(prevCategories);
        }
    };

    return { categories, addCategory, updateCategory, deleteCategory };
}
