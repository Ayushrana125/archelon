const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('VITE_API_URL is not set. Add it to your .env file.');
}

export default API_URL;
