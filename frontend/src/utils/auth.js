export const getToken = () => localStorage.getItem('pulso_token') || localStorage.getItem('token');
export const setToken = (token) => {
    localStorage.setItem('pulso_token', token);
    localStorage.setItem('token', token);
};
export const removeToken = () => {
    localStorage.removeItem('pulso_token');
    localStorage.removeItem('token');
};

export const getUser = () => {
    const userStr = localStorage.getItem('pulso_user') || localStorage.getItem('user');
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch {
        return null;
    }
};
export const setUser = (user) => {
    localStorage.setItem('pulso_user', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
};
export const removeUser = () => {
    localStorage.removeItem('pulso_user');
    localStorage.removeItem('user');
};

export const getStoredToken = getToken;
export const getStoredUser = getUser;