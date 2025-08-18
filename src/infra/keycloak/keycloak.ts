import axios from "axios";
import { HttpException } from "../../utils/http-exception.ts";
import {
  keycloakClientId,
  keycloakClientSecret,
  keycloakRealm,
  keycloakUrl,
} from "./config.ts";
import { KEYCLOAK_ACTIONS_EMAIL } from "./enum.ts";
import winston from "../../winston.ts";

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
    const errorResponse = error?.response?.data;
    const errorMessage = errorResponse.errorMessage;
    const errorStatus = error?.status;
    if (!errorMessage) {
      if (errorStatus === 400 || errorStatus === 409) {
        throw new HttpException(
          error.status,
          errorResponse.error_description || errorResponse.error_description,
        );
      }
      throw new HttpException(
        500,
        `keycloakCreateUser: ${JSON.stringify(error?.response || error)}`,
      );
    }
    if (errorStatus === 400 || errorStatus === 409) {
      throw new HttpException(errorStatus, errorMessage);
    }
    throw new HttpException(500, errorMessage);
  }
};

export const executeActionsEmail = async (
  action: KEYCLOAK_ACTIONS_EMAIL,
  userId: string,
  errorOut: boolean,
) => {
  const m2mToken = await getM2MToken();
  try {
    await axios.put(
      `${keycloakUrl}/admin/realms/${keycloakRealm}/users/${userId}/execute-actions-email`,
      [action],
      { headers: { Authorization: `Bearer ${m2mToken}` } },
    );
    // deno-lint-ignore no-explicit-any
  } catch (error: any) {
    const errorInformation = error?.response?.data || error;
    if (errorOut) {
      throw new HttpException(
        500,
        JSON.stringify(errorInformation),
      );
    } else {
      const logger = winston.child({ source: "executeActionsEmail" });
      logger.error(errorInformation);
    }
  }
};
