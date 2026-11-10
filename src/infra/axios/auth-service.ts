import axios from "axios";
import config from "../get-config.ts";
import { getM2MToken } from "../keycloak/keycloak.ts";

const authServiceAxios = axios.create({
  baseURL: config.AUTH_SERVICE_URL,
});

authServiceAxios.interceptors.request.use(async (request) => {
  request.headers.Authorization = `Bearer ${await getM2MToken("auth")}`;
  return request;
});

export default authServiceAxios;
