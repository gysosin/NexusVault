import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';
import { persistAuthToken, readAuthToken } from '../lib/authTokenStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(readAuthToken);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const persistToken = useCallback((newToken) => {
        if (newToken) {
            persistAuthToken(newToken);
            setToken(newToken);
            return;
        }

        try {
            persistAuthToken(null);
        } catch {
            // Local state still needs to clear when browser storage is unavailable.
        }
        setToken(null);
    }, []);

    const refreshUser = useCallback(async () => {
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }
        try {
            const userData = await authApi.getMe();
            setUser(userData);
        } catch (err) {
            console.error('Failed to fetch user', err);
            persistToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [token, persistToken]);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    const login = async (identifier, password) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authApi.login(identifier, password);
            persistToken(data.token);
            setUser(data.user);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const register = async (data) => {
        setLoading(true);
        setError(null);
        try {
            await authApi.register(data);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch {
            // Logout should clear local state even if the server session is already gone.
        }
        persistToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, error, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
