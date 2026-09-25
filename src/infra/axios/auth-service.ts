import axios from "axios";
import { storage } from "../../utils/async-local-storage.ts";
import config from "../get-config.ts";

const authServiceAxios = axios.create({
  baseURL: config.AUTH_SERVICE_URL,
});

authServiceAxios.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const store = storage.getStore();
    config.headers.Authorization = `Bearer ${store?.token}`;
  }
  return config;
});

export default authServiceAxios;
