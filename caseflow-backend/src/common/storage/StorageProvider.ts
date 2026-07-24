// Abstract storage so the rest of the app never talks to the filesystem
// or S3 directly. Swapping STORAGE_DRIVER=s3 later means implementing
// this interface once (S3StorageProvider) — no changes anywhere else.
export interface StorageProvider {
  /** Persist a file buffer under a namespacing folder, returning the storage key to save on the owning row. */
  save(params: { buffer: Buffer; originalName: string; folder: string }): Promise<string>;

  /** Retrieve a file's bytes by storage key. */
  read(storageKey: string): Promise<Buffer>;

  /** Remove a file by storage key. */
  delete(storageKey: string): Promise<void>;

  /** Build a URL/path the frontend can use to fetch/preview the file. */
  getUrl(storageKey: string): Promise<string>;
}
