import { TYPES } from "./constants.ts";

export type AuthResourceType = "context" | "account";

export type AuthResourceRef = {
  resourceType: AuthResourceType;
  resourceId: string;
  version: number;
};

export type JobDto = {
  type: TYPES.AUTH_SYNC;
  payload: AuthResourceRef;
};
