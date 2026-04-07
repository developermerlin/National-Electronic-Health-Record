import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [authTokens, setAuthTokens] = useState(() => 
        localStorage.getItem('authTokens') 
            ? JSON.parse(localStorage.getItem('authTokens')) 
            : null
    );

    const API_BASE_URL = 'http://localhost:8000/api/v1';

    useEffect(() => {
        if (authTokens) {
            try {
                const decoded = jwtDecode(authTokens.access);
                setUser(decoded);
            } catch (error) {
                console.error('Invalid token:', error);
                localStorage.removeItem('authTokens');
                setAuthTokens(null);
            }
        }
    }, [authTokens]);

    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/user/token/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setAuthTokens(data);
                const decoded = jwtDecode(data.access);
                setUser(decoded);
                localStorage.setItem('authTokens', JSON.stringify(data));
                return { success: true, user: decoded };
            } else {
                return { success: false, error: data.detail || 'Login failed' };
            }
        } catch (error) {
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const logout = () => {
        setAuthTokens(null);
        setUser(null);
        localStorage.removeItem('authTokens');
    };

    const refreshToken = async () => {
        if (!authTokens?.refresh) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/user/token/refresh/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: authTokens.refresh }),
            });

            const data = await response.json();

            if (response.ok) {
                setAuthTokens(data);
                const decoded = jwtDecode(data.access);
                setUser(decoded);
                localStorage.setItem('authTokens', JSON.stringify(data));
                return true;
            } else {
                logout();
                return false;
            }
        } catch (error) {
            logout();
            return false;
        }
    };

    const getAuthHeaders = () => {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authTokens?.access}`,
        };
    };

    const apiCall = async (endpoint, options = {}) => {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            ...getAuthHeaders(),
            ...options.headers,
        };

        try {
            let response = await fetch(url, { ...options, headers });

            if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    const newHeaders = {
                        ...getAuthHeaders(),
                        ...options.headers,
                    };
                    response = await fetch(url, { ...options, headers: newHeaders });
                } else {
                    throw new Error('Session expired. Please login again.');
                }
            }

            return response;
        } catch (error) {
            throw error;
        }
    };

    const hasPermission = (permission) => {
        return user?.permissions?.includes(permission) || false;
    };

    const hasRole = (role) => {
        return user?.role === role;
    };

    const isAdmin = () => {
        return user?.role === 'admin';
    };

    const contextValue = {
        user,
        authTokens,
        loading,
        login,
        logout,
        refreshToken,
        apiCall,
        hasPermission,
        hasRole,
        isAdmin,
        API_BASE_URL,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
