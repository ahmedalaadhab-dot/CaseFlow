import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { StorageProvider } from "./StorageProvider";
import { env } from "../../config/env";

export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;

  constructor(root: string = env.STORAGE_LOCAL_PATH) {
    this.root = root;
  }

  private async ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
  }

  async save({ buffer, originalName, folder }: { buffer: Buffer; originalName: string; folder: string }): Promise<string> {
    const dir = path.join(this.root, folder);
    await this.ensureDir(dir);

    const ext = path.extname(originalName);
    const key = path.join(folder, `${randomUUID()}${ext}`);
    await fs.writeFile(path.join(this.root, key), buffer);
    return key.split(path.sep).join("/"); // normalize to forward slashes as the stored key
  }

  async read(storageKey: string): Promise<Buffer> {
    return fs.readFile(path.join(this.root, storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    await fs.rm(path.join(this.root, storageKey), { force: true });
  }

  async getUrl(storageKey: string): Promise<string> {
    // In dev, files are served statically from /uploads (see app.ts).
    return `/uploads/${storageKey}`;
  }
}
