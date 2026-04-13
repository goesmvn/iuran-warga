import { useState, useEffect } from 'react';
import type { User } from '../types';
import { apiFetch } from '../utils/apiFetch';

export function useUsers() {
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        apiFetch('/api/users')
            .then(res => res.json())
            .then(data => setUsers(data))
            .catch(err => console.error("Failed to fetch users:", err));
    }, []);

    const addUser = async (newUser: Omit<User, 'id'>) => {
        const id = `usr-${Date.now()}`;
        const payload = { ...newUser, id };
        setUsers(prev => [...prev, payload]);
        try {
            const res = await apiFetch('/api/users', {
                method: 'POST',
                body: JSON.stringify(payload) // Content-type is already added by apiFetch automatically
            });
            const data = await res.json();
            if(!res.ok) alert(data.error);
        } catch(e) {
            console.error(e);
        }
    };

    const updateUser = async (id: string, updatedData: Partial<User>) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updatedData } as User: u));
        // Note: No backend route for update user right now. Added optimistic for consistency.
    };

    const deleteUser = async (id: string) => {
        setUsers(prev => prev.filter(u => u.id !== id));
        try {
            await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
        } catch(e) {
            console.error(e);
        }
    };

    return { users, addUser, updateUser, deleteUser };
}
