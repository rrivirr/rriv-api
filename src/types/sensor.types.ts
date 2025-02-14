import { z } from "zod";
import { AccountIdDto, IdDto } from "./generic.types.ts";
import {
  createNewSensorLibraryConfigVersionValidationSchema,
  createSensorConfigValidationSchema,
  createSensorDriverValidationSchema,
  createSensorLibraryConfigValidationSchema,
  sensorConfigQueryValidationSchema,
  sensorDriverQueryValidationSchema,
  sensorLibraryConfigQueryValidationSchema,
} from "../handler/sensor/schema.ts";

export type CreateSensorDriverDto =
  & z.infer<typeof createSensorDriverValidationSchema>
  & AccountIdDto;

export type CreateSensorConfigDto =
  & z.infer<typeof createSensorConfigValidationSchema>
  & AccountIdDto;

export type QuerySensorConfigDto =
  & z.input<typeof sensorConfigQueryValidationSchema>
  & AccountIdDto
  & { name?: string };

export type QuerySensorDriverDto =
  & z.input<typeof sensorDriverQueryValidationSchema>
  & { name?: string };

export type CreateSensorLibraryConfigDto =
  & z.input<typeof createSensorLibraryConfigValidationSchema>
  & AccountIdDto;

export type QuerySensorLibraryConfigDto =
  & z.input<typeof sensorLibraryConfigQueryValidationSchema>
  & { name?: string };

export type CreateSensorLibraryConfigVersionDto =
  & z.infer<
    typeof createNewSensorLibraryConfigVersionValidationSchema
  >
  & IdDto
  & AccountIdDto;
