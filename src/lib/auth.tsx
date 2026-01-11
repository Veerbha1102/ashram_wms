'use client';
import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface User {
    id: string;
    name: string;
    phone: string;
    role: 'worker' | 'admin' | 'swamiji';
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    useEffect(() => {
        checkAuth();
    }, [pathname]);

    async function checkAuth() {
        const token = localStorage.getItem('aakb_device_token');

        // Allow access to login page without token
        if (pathname === '/login') {
            setLoading(false);
            return;
        }

        if (!token) {
            router.push('/login');
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, phone, role')
                .eq('device_token', token)
                .single();

            if (error || !data) {
                localStorage.removeItem('aakb_device_token');
                router.push('/login');
                setLoading(false);
                return;
            }

            setUser(data);

            // Role-based route protection
            const allowedPaths: Record<string, string[]> = {
                worker: ['/worker', '/worker/history', '/worker/reports', '/worker/profile'],
                admin: ['/admin', '/admin/workers', '/admin/tasks', '/admin/leaves', '/admin/attendance', '/admin/settings'],
                swamiji: ['/swamiji', '/swamiji/reports', '/swamiji/announce'],
            };

            const userPaths = allowedPaths[data.role] || [];
            const isAllowed = userPaths.some(p => pathname.startsWith(p)) || pathname === '/';

            if (!isAllowed && pathname !== '/') {
                // Redirect to appropriate dashboard
                router.push(`/${data.role}`);
            }

        } catch (err) {
            console.error('Auth error:', err);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    }

    function logout() {
        localStorage.removeItem('aakb_device_token');
        setUser(null);
        router.push('/login');
    }

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
