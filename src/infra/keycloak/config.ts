export const keycloakUrl = Deno.env.get("KEYCLOAK_URL");
export const keycloakClientId = Deno.env.get("KEYCLOAK_CLIENT_ID");
export const keycloakClientSecret = Deno.env.get("KEYCLOAK_CLIENT_SECRET");
export const keycloakAuthClientId = Deno.env.get("KEYCLOAK_AUTH_CLIENT_ID");
export const keycloakAuthClientSecret = Deno.env.get(
  "KEYCLOAK_AUTH_CLIENT_SECRET",
);
export const keycloakRealm = Deno.env.get("KEYCLOAK_REALM");
export const keycloakIssuer = `${keycloakUrl}/realms/${keycloakRealm}`;
