export const getToken = () => 
    sessionStorage.getItem('pulso_token') || 
    sessionStorage.getItem('token') || 
    localStorage.getItem('pulso_token') || 
    localStorage.getItem('token') || 
    null;

export const setToken = (token) => {
    if (token) {
        sessionStorage.setItem('pulso_token', token);
        localStorage.setItem('pulso_token', token);
        localStorage.setItem('token', token);
    }
};

export const removeToken = () => {
    sessionStorage.removeItem('pulso_token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('pulso_token');
    localStorage.removeItem('token');
};

export const getUser = () => {
    const userStr = sessionStorage.getItem('pulso_user') || 
                    sessionStorage.getItem('user') || 
                    localStorage.getItem('pulso_user') || 
                    localStorage.getItem('user');
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch {
        return null;
    }
};

export const setUser = (user) => {
    if (user) {
        const str = typeof user === 'string' ? user : JSON.stringify(user);
        sessionStorage.setItem('pulso_user', str);
        localStorage.setItem('pulso_user', str);
        localStorage.setItem('user', str);
    }
};

export const removeUser = () => {
    sessionStorage.removeItem('pulso_user');
    sessionStorage.removeItem('user');
    localStorage.removeItem('pulso_user');
    localStorage.removeItem('user');
};

export const getStoredToken = getToken;
export const getStoredUser = getUser;