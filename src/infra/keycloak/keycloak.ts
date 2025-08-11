import axios from "axios";
import { HttpException } from "../../utils/http-exception.ts";
import {
  keycloakClientId,
  keycloakClientSecret,
  keycloakRealm,
  keycloakUrl,
} from "./config.ts";

export const getPublicKey = async () => {
  try {
    const response = await axios.get(`${keycloakUrl}/realms/${keycloakRealm}`);
    return response.data.public_key;

    // deno-lint-ignore no-explicit-any
  } catch (error: any) {
    throw new HttpException(
      500,
      JSON.stringify(error?.response.data) || error?.message,
    );
  }
};

export const getM2MToken = async () => {
  try {
    const response = await axios.post(
      `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: keycloakClientId!,
        client_secret: keycloakClientSecret!,
        grant_type: "client_credentials",
      }),
    );

    return response.data.access_token;
    // deno-lint-ignore no-explicit-any
  } catch (error: any) {
    throw new HttpException(
      500,
      JSON.stringify(error?.response.data) || error?.message,
    );
  }
};

export const createUser = async (
  body: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  },
) => {
  const { email, firstName, lastName, password } = body;
  const m2mToken = await getM2MToken();

  try {
    const response = await axios.post(
      `${keycloakUrl}/admin/realms/${keycloakRealm}/users`,
      {
        username: email,
        enabled: "true",
        firstName,
        lastName,
        email,
        credentials: [{
          "type": "password",
          "value": password,
          "temporary": false,
        }],
      },
      { headers: { Authorization: `Bearer ${m2mToken}` } },
    );
    const location = response.headers.location;
    const userId = location.split("users/")[1];
    return userId;
    // deno-lint-ignore no-explicit-any
  } catch (error: any) {
    const errorMessage = error?.response?.data?.errorMessage;
    const errorStatus = error?.response.status;
    if (!errorMessage) {
      throw new HttpException(500, `keycloak: ${JSON.stringify(error)}`);
    }
    if (errorStatus === 400 || errorStatus === 409) {
      throw new HttpException(errorStatus, errorMessage);
    }
    throw new HttpException(500, errorMessage);
  }
};
