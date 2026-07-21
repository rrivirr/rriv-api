import axios from "axios";
import { storage } from "../../utils/async-local-storage.ts";

const authServiceAxios = axios.create({
  baseURL: Deno.env.get("AUTH_SERVICE_URL"),
});

authServiceAxios.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const store = storage.getStore();
    config.headers.Authorization = `Bearer ${store?.token}`;
  }
  return config;
});

export default authServiceAxios;
