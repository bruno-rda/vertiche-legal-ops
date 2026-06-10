import { client } from '@/client/client.gen';
import { useAuthStore } from '@/stores/authStore';

if (!import.meta.env.VITE_API_URL) {
    throw new Error('[api] VITE_API_URL is not set');
}

client.setConfig({ baseUrl: import.meta.env.VITE_API_URL });

client.interceptors.request.use(async (request) => {
    const token = useAuthStore.getState().token;
    if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
});
