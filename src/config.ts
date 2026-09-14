const trimSlash = (url: string) => url.replace(/\/+$/, '');

export const BACKEND_URL = trimSlash(import.meta.env.VITE_BACKEND_URL || 'https://sketchsync-backend-bkjk.onrender.com');

export const boardUrl = (roomId: string) => `${window.location.origin}/board/${roomId}`;

export const mcpUrl = (roomId: string) => `${BACKEND_URL}/mcp/${roomId}`;
