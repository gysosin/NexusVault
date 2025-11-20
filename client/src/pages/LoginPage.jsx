import { useState } from 'react';
import { Card } from '@/components/ui/card';
import AuthPanel from '../components/auth/AuthPanel';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
    const { login, register, user } = useAuth();
    const [authLoading, setAuthLoading] = useState(false);
    const [authMessage, setAuthMessage] = useState('');

    const handleLogin = async ({ identifier, password }) => {
        setAuthLoading(true);
        try {
            await login(identifier, password);
            setAuthMessage('Logged in successfully.');
        } catch (err) {
            setAuthMessage(err.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleRegister = async (registration) => {
        setAuthLoading(true);
        try {
            await register(registration);
            setAuthMessage('Account created—please log in.');
        } catch (err) {
            setAuthMessage(err.message);
        } finally {
            setAuthLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[radial-gradient(circle_at_top,#192036,#090c14_70%)]">
            <Card className="w-full max-w-[520px] bg-brand-surface border-brand-border p-6 shadow-[0_20px_45px_rgba(0,0,0,0.6)] rounded-3xl">
                <div className="space-y-4 text-center">
                    <h1 className="text-3xl font-bold">Log In to Your Account</h1>
                    <p className="text-gray-400">Welcome back to the future of finance.</p>
                </div>
                <div className="mt-6 space-y-6">
                    <AuthPanel
                        user={user}
                        status={authMessage}
                        loading={authLoading}
                        onLogin={handleLogin}
                        onRegister={handleRegister}
                        onLogout={() => { }}
                    />
                </div>
            </Card>
        </div>
    );
};
