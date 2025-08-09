// @ts-types="generated/index.d.ts"
import { SensorConfig } from "generated/index.js";
import { getConfigChangesMade } from "./get-changes-made.ts";

// could be optimized, maybe ??
export const getSensorConfigChanges = (sensorConfigs: SensorConfig[]) => {
  if (sensorConfigs.length < 2) {
    return sensorConfigs;
  }
  const sensorConfigWithDifference = [];

  sensorConfigWithDifference.push(sensorConfigs[0]);

  const sensorConfigsByName: {
    [key: string]: [SensorConfig];
  } = {};

  for (const sensorConfig of sensorConfigs) {
    const sensorConfigName = sensorConfig.name;
    const sensorConfigsByCurrentName = sensorConfigsByName[sensorConfigName];

    if (sensorConfigsByCurrentName) {
      //  sensorConfigsByCurrentName is a shallow copy
      sensorConfigsByCurrentName.push(sensorConfig);
    } else {
      sensorConfigsByName[sensorConfigName] = [sensorConfig];
    }
  }

  // deno-lint-ignore no-explicit-any
  const sensorConfigChangesMade: { [key: string]: any } = {};

  for (const sensorConfigs of Object.values(sensorConfigsByName)) {
    for (let i = 1; i < sensorConfigs.length; i++) {
      const { id, config } = sensorConfigs[i];
      const previousConfig = sensorConfigs[i - 1].config;
      const currentConfig = config;

      const changesMade = getConfigChangesMade({
        previousConfig,
        currentConfig,
      });

      sensorConfigChangesMade[id] = changesMade;
    }
  }

  return sensorConfigs.map((s) => ({
    ...s,
    changesMade: sensorConfigChangesMade[s.id],
  }));
};
