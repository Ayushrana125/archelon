const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.warn('VITE_API_URL is not set. API calls will fail.');
}

export default API_URL;
