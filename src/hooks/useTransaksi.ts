import { useState, useEffect } from 'react';
import type { Transaction } from '../types';
import { apiFetch } from '../utils/apiFetch';

export function useTransaksi() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        apiFetch('/api/transactions')
            .then(res => res.json())
            .then(data => setTransactions(data))
            .catch(err => console.error("Failed to fetch transactions:", err));
    }, []);

    const addTransaction = async (newTx: Omit<Transaction, 'id'>) => {
        const id = `tx-${Date.now()}`;
        const payload = { ...newTx, id };
        setTransactions(prev => [...prev, payload]); // Optimistic
        await apiFetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    };

    const updateTransaction = async (id: string, updatedData: Partial<Transaction>) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedData } as Transaction : t)); // Optimistic
        await apiFetch(`/api/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
    };

    const deleteTransaction = async (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id)); // Optimistic
        await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
    };

    return { transactions, addTransaction, updateTransaction, deleteTransaction };
}
