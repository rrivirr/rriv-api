import axios from "axios";
import config from "../get-config.ts";
import { getM2MToken } from "../keycloak/keycloak.ts";

const dataApiAxios = axios.create({ baseURL: config.DATA_API_URL });

dataApiAxios.interceptors.request.use(async (request) => {
  request.headers.Authorization = `Bearer ${await getM2MToken("data")}`;
  return request;
});

export default dataApiAxios;
