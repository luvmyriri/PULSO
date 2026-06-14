export const getToken = () => localStorage.getItem('pulso_token');
export const setToken = (token) => localStorage.setItem('pulso_token', token);
export const removeToken = () => localStorage.removeItem('pulso_token');
export const getUser = () => {
    const userStr = localStorage.getItem('pulso_user');
    return userStr ? JSON.parse(userStr) : null;
};
export const setUser = (user) => localStorage.setItem('pulso_user', JSON.stringify(user));
export const removeUser = () => localStorage.removeItem('pulso_user');