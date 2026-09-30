import { getConfigChangesMade } from "./get-changes-made.ts";

export const getDataloggerConfigChanges = <T extends { config: unknown }>(
  dataloggerConfigs: T[],
) => {
  if (dataloggerConfigs.length < 2) {
    return dataloggerConfigs;
  }

  const withDifference: Array<T & { changesMade?: unknown }> = [
    dataloggerConfigs[0],
  ];
  for (let i = 1; i < dataloggerConfigs.length; i++) {
    withDifference.push({
      ...dataloggerConfigs[i],
      changesMade: getConfigChangesMade({
        previousConfig: dataloggerConfigs[i - 1].config,
        currentConfig: dataloggerConfigs[i].config,
      }),
    });
  }

  return withDifference;
};
