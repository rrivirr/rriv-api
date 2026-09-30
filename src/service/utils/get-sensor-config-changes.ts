import { getConfigChangesMade } from "./get-changes-made.ts";

export const getSensorConfigChanges = <
  T extends { id: string; name: string; config: unknown },
>(
  sensorConfigs: T[],
) => {
  if (sensorConfigs.length < 2) {
    return sensorConfigs;
  }

  const sensorConfigsByName: Record<string, T[]> = {};
  for (const sensorConfig of sensorConfigs) {
    (sensorConfigsByName[sensorConfig.name] ??= []).push(sensorConfig);
  }

  const sensorConfigChangesMade: Record<string, unknown> = {};
  for (const configs of Object.values(sensorConfigsByName)) {
    for (let i = 1; i < configs.length; i++) {
      sensorConfigChangesMade[configs[i].id] = getConfigChangesMade({
        previousConfig: configs[i - 1].config,
        currentConfig: configs[i].config,
      });
    }
  }

  return sensorConfigs.map((sensorConfig) => ({
    ...sensorConfig,
    changesMade: sensorConfigChangesMade[sensorConfig.id],
  }));
};
