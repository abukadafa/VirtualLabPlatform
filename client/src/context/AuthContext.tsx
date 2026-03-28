import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_URL } from '../lib/config';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    studentId?: string;
    programmes?: string[];
    permissions?: string[];
}

interface Branding {
    appName: string;
    logoUrl: string;
    secondaryLogoUrl?: string;
    faviconUrl: string;
    primaryColor: string;
    secondaryColor: string;
    roles?: { name: string; color?: string; description?: string }[];
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    branding: Branding | null;
    login: (identifier: string, password: string, role?: string) => Promise<void>;
    register: (userData: any) => Promise<void>;
    logout: () => void;
    refreshBranding: () => Promise<void>;
    refreshUser: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [branding, setBranding] = useState<Branding | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = async () => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            try {
                const response = await fetch(`${API_URL}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${storedToken}`,
                    },
                });
                if (response.ok) {
                    const userData = await response.json();
                    setUser(userData);
                }
            } catch (error) {
                console.error('User refresh failed:', error);
            }
        }
    };

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
            null;
    };

    const applyBranding = (data: Branding) => {
        if (!data) return;
        
        // Update title
        if (data.appName) {
            document.title = data.appName;
        }

        // Update Favicon
        let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }

        if (data.faviconUrl) {
            favicon.href = data.faviconUrl;
            // Handle PNG vs ICO vs SVG
            if (data.faviconUrl.endsWith('.png')) {
                favicon.type = 'image/png';
            } else if (data.faviconUrl.endsWith('.svg')) {
                favicon.type = 'image/svg+xml';
            } else {
                favicon.type = 'image/x-icon';
            }
        }

        // Apply dynamic CSS variables for colors
        const root = document.documentElement;
        if (data.primaryColor) {
            root.style.setProperty('--primary-color', data.primaryColor);
            const rgb = hexToRgb(data.primaryColor);
            if (rgb) root.style.setProperty('--primary-rgb', rgb);
        }
        if (data.secondaryColor) {
            root.style.setProperty('--secondary-color', data.secondaryColor);
            const rgb = hexToRgb(data.secondaryColor);
            if (rgb) root.style.setProperty('--secondary-rgb', rgb);
        }
    };

    const fetchPublicSettings = async () => {
        try {
            const response = await fetch(`${API_URL}/api/settings/public`);
            if (response.ok) {
                const data = await response.json();
                setBranding(data);
                applyBranding(data);
            }
        } catch (error) {
            console.error('Failed to fetch branding:', error);
        }
    };

    useEffect(() => {
        fetchPublicSettings();
        
        // Check if user is already logged in
        const checkAuth = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                try {
                    const response = await fetch(`${API_URL}/api/auth/me`, {
                        headers: {
                            Authorization: `Bearer ${storedToken}`,
                        },
                    });
                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                        setToken(storedToken);
                    } else {
                        localStorage.removeItem('token');
                    }
                } catch (error) {
                    console.error('Auth check failed:', error);
                    localStorage.removeItem('token');
                }
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (identifier: string, password: string, role?: string) => {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ identifier, password, role }),
        });

        if (!response.ok) {
            let errorMessage = 'Login failed';
            try {
                const text = await response.text();
                try {
                    const error = JSON.parse(text);
                    errorMessage = error.message || errorMessage;
                } catch (e) {
                    errorMessage = text || errorMessage;
                }
            } catch (e) {
                // Ignore
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('token', data.token);
    };

    const register = async (userData: any) => {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...userData,
                username: userData.email.split('@')[0], // Generate username from email
            }),
        });

        if (!response.ok) {
            let errorMessage = 'Registration failed';
            try {
                const text = await response.text();
                try {
                    const error = JSON.parse(text);
                    errorMessage = error.message || errorMessage;
                } catch (e) {
                    errorMessage = text || errorMessage;
                }
            } catch (e) {
                // Ignore
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('token', data.token);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
    };

    const refreshBranding = async () => {
        await fetchPublicSettings();
    };

    return (
        <AuthContext.Provider value={{ user, token, branding, login, register, logout, refreshBranding, refreshUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
