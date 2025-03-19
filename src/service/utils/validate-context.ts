import { UniqueContextDto } from "../../types/context.types.ts";
import { HttpException } from "../../utils/http-exception.ts";
import { getContextById } from "../context.service.ts";

export const validateContext = async (body: UniqueContextDto) => {
  const context = await getContextById(body);

  if (!context) {
    throw new HttpException(404, "context not found");
  }
  if (context.endedAt) {
    throw new HttpException(409, "context has ended");
  }
};
