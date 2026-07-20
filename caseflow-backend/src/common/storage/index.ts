import { env } from "../../config/env";
import { StorageProvider } from "./StorageProvider";
import { LocalStorageProvider } from "./LocalStorageProvider";
import { S3StorageProvider } from "./S3StorageProvider";

function createStorageProvider(): StorageProvider {
  switch (env.STORAGE_DRIVER) {
    case "local":
      return new LocalStorageProvider();
    case "s3":
      return new S3StorageProvider();
    default:
      return new LocalStorageProvider();
  }
}

export const storage = createStorageProvider();
