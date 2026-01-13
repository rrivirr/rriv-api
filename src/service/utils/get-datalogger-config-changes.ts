import { DataloggerConfig } from "generated/client.ts";
import { getConfigChangesMade } from "./get-changes-made.ts";

export const getDataloggerConfigChanges = (
  dataloggerConfigs: DataloggerConfig[],
) => {
  if (dataloggerConfigs.length < 2) {
    return dataloggerConfigs;
  }
  const dataloggerConfigWithDifference = [];
  dataloggerConfigWithDifference.push(dataloggerConfigs[0]);

  for (let i = 1; i < dataloggerConfigs.length; i++) {
    const previousConfig = dataloggerConfigs[i - 1].config;
    const currentConfig = dataloggerConfigs[i].config;

    const changesMade = getConfigChangesMade({ previousConfig, currentConfig });

    dataloggerConfigWithDifference.push({
      ...dataloggerConfigs[i],
      changesMade,
    });
  }

  return dataloggerConfigWithDifference;
};
