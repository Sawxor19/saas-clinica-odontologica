export type StorageUploadResult = {
  path: string;
  url: string | null;
};

export interface StorageProvider {
  upload(file: File, path: string): Promise<StorageUploadResult>;
  getSignedUrl(path: string): Promise<string | null>;
  remove(path: string): Promise<void>;
}
