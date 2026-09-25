import config from "../get-config.ts";

export const keycloakUrl = config.KEYCLOAK_URL;
export const keycloakClientId = config.KEYCLOAK_CLIENT_ID;
export const keycloakClientSecret = config.KEYCLOAK_CLIENT_SECRET;
export const keycloakAuthClientId = config.KEYCLOAK_AUTH_CLIENT_ID;
export const keycloakAuthClientSecret = config.KEYCLOAK_AUTH_CLIENT_SECRET;
export const keycloakRealm = config.KEYCLOAK_REALM;
export const keycloakIssuer = `${keycloakUrl}/realms/${keycloakRealm}`;
