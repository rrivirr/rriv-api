import dotenv from "dotenv";
import fs, { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

export const readConfigFiles = (): Record<string, string> => {
  const dirPath = path.join(homedir(), ".auth-api");
  const localDirPath = `${path.join("./config")}`;
  const filePath = `${path.join(dirPath, "config")}`;
  const localFilePath = `${path.join(localDirPath, "config")}`;
  let fileContent;
  let localFileContent;

  if (existsSync(filePath)) {
    fileContent = fs.readFileSync(filePath, "utf8");
  }
  if (existsSync(localFilePath)) {
    localFileContent = fs.readFileSync(localFilePath, "utf8");
  }

  return {
    ...(fileContent && dotenv.parse(fileContent)),
    ...(localFileContent && dotenv.parse(localFileContent)),
  };
};

export const writeDatabaseCaCert = (DATABASE_CA_CRT: string) => {
  const pem = `${DATABASE_CA_CRT.replace(/\s(?!CERTIFICATE)/g, "\n").trim()}\n`;
  const certFilePath = path.join(".", "ca-certificate.crt");
  fs.writeFileSync(certFilePath, pem, { mode: 0o600 });
};
