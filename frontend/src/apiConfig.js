import axios from 'axios';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');

    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = token;
    }

    return config;
});

axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isAuthRefreshRequest = originalRequest?.url?.includes('/api/auth/refresh-token');
        const isAuthLoginRequest = originalRequest?.url?.includes('/api/auth/login');

        if (error.response?.status !== 401 || originalRequest?._retry || isAuthRefreshRequest || isAuthLoginRequest) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            const refreshResponse = await axios.post(`${API_URL}/api/auth/refresh-token`);
            localStorage.setItem('token', refreshResponse.data.token);
            localStorage.setItem('userId', refreshResponse.data.userId);
            localStorage.setItem('userName', refreshResponse.data.userName);

            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = refreshResponse.data.token;

            return axios(originalRequest);
        } catch (refreshError) {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('userName');

            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }

            return Promise.reject(refreshError);
        }
    }
);

export { API_URL };
