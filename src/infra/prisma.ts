// @ts-types="generated/index.d.ts"
import { PrismaClient } from "generated/index.js";

export default new PrismaClient({
  omit: {
    context: {
      archivedAt: true,
    },
    device: {
      archivedAt: true,
    },
  },
});
