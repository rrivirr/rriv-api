import { WriteRelationshipDto } from "../../types/auth-service.types.ts";
import { TYPES } from "./constants.ts";

export type JobDto = {
  type: TYPES.AUTH_SERVICE_WRITE;
  payload: WriteRelationshipDto;
};
