/**
 * LaunchPulse Storage Client
 *
 * This client provides a simple API for file storage that routes all calls through
 * the LaunchPulse platform proxy. This allows generated apps to store files
 * without needing to manage their own storage credentials.
 *
 * Environment Variables (auto-injected by LaunchPulse):
 * - VITE_LAUNCHPULSE_API_KEY: API token for authentication
 * - VITE_LAUNCHPULSE_PROJECT_ID: Project identifier
 * - VITE_LAUNCHPULSE_API_URL: Platform API URL (default: https://launchpulse.ai)
 */

// Storage error class (matches StripeError pattern)
export class StorageError extends Error {
  type: string;
  param?: string;
  code?: string;

  constructor(message: string, type: string, param?: string, code?: string) {
    super(message);
    this.name = 'StorageError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

// Check if LaunchPulse env vars are set
const env = {
  LAUNCHPULSE_API_KEY: import.meta.env.VITE_LAUNCHPULSE_API_KEY,
  LAUNCHPULSE_PROJECT_ID: import.meta.env.VITE_LAUNCHPULSE_PROJECT_ID,
  LAUNCHPULSE_API_URL: import.meta.env.VITE_LAUNCHPULSE_API_URL || 'https://launchpulse.ai',
};

const hasLaunchPulseEnv =
  env.LAUNCHPULSE_API_KEY &&
  env.LAUNCHPULSE_PROJECT_ID &&
  env.LAUNCHPULSE_API_URL;

// File metadata type
export interface FileMetadata {
  id: string;
  project_id: string;
  file_key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  is_public: boolean;
  url: string | null;  // Permanent public URL if is_public, null otherwise
  created_at: string;
  updated_at: string;
}

// Storage usage type
export interface StorageUsage {
  total_bytes: number;
  file_count: number;
  quota_bytes: number;
  usage_percent: number;
}

// Upload options type
export interface UploadOptions {
  /** Whether the file should be publicly accessible (default: true) */
  public?: boolean;
}

// Upload result type
export interface UploadResult {
  key: string;
  size: number;
  /** Permanent public URL if file is public, null if private */
  url: string | null;
}

// Make request to LaunchPulse storage proxy
async function storageRequest<T>(path: string, params: Record<string, any> = {}): Promise<T> {
  if (!hasLaunchPulseEnv) {
    throw new StorageError(
      'LaunchPulse Storage not configured. Please connect in your LaunchPulse dashboard.',
      'configuration_error',
      undefined,
      'STORAGE_NOT_CONFIGURED'
    );
  }

  const response = await fetch(`${env.LAUNCHPULSE_API_URL}/api/storage/proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId: env.LAUNCHPULSE_PROJECT_ID,
      token: env.LAUNCHPULSE_API_KEY,
      path,
      params,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const error = data.error || { message: 'An error occurred', type: 'api_error' };
    throw new StorageError(error.message, error.type, error.param, error.code);
  }

  return data;
}

/**
 * Storage client for file operations
 */
export const storage = {
  /**
   * Upload a file to storage
   *
   * @param file - The file to upload
   * @param options - Upload options
   * @param options.public - Whether file should be publicly accessible (default: true)
   * @returns Promise with the file key, size, and permanent URL (if public)
   *
   * @example
   * ```typescript
   * // Public upload (default) - returns permanent URL
   * const result = await storage.upload(file);
   * console.log('Public URL:', result.url);  // Works forever!
   *
   * // Private upload - must use getDownloadUrl() for access
   * const privateResult = await storage.upload(file, { public: false });
   * const tempUrl = await storage.getDownloadUrl(privateResult.key);  // 15-min expiry
   * ```
   */
  async upload(file: File, options: UploadOptions = {}): Promise<UploadResult> {
    const isPublic = options.public !== false;  // Default: true

    // 1. Get presigned URL from proxy
    const { uploadUrl, key } = await storageRequest<{ uploadUrl: string; key: string }>('upload-url', {
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
      public: isPublic,
    });

    // 2. Upload directly to R2 using presigned URL
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!uploadResponse.ok) {
      throw new StorageError(
        'Failed to upload file to storage',
        'upload_error',
        undefined,
        'UPLOAD_FAILED'
      );
    }

    // 3. Confirm upload with proxy (saves metadata, returns public URL if public)
    const { size, url } = await storageRequest<{ size: number; url: string | null }>('confirm-upload', {
      key,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      claimedSize: file.size,
      public: isPublic,
    });

    return { key, size, url };
  },

  /**
   * Get a download URL for a file
   *
   * For public files, returns the permanent public URL.
   * For private files, returns a presigned URL that expires in 15 minutes.
   *
   * @param fileKey - The file key returned from upload
   * @returns Promise with the download URL
   *
   * @example
   * ```typescript
   * const url = await storage.getDownloadUrl('user123/project456/image.png');
   * window.open(url, '_blank');
   * ```
   */
  async getDownloadUrl(fileKey: string): Promise<string> {
    const { downloadUrl } = await storageRequest<{ downloadUrl: string }>('download-url', {
      fileKey,
    });
    return downloadUrl;
  },

  /**
   * List all files in the project
   *
   * @returns Promise with array of file metadata
   *
   * @example
   * ```typescript
   * const files = await storage.list();
   * files.forEach(file => {
   *   console.log(`${file.filename} (${file.size_bytes} bytes)`);
   * });
   * ```
   */
  async list(): Promise<FileMetadata[]> {
    const { files } = await storageRequest<{ files: FileMetadata[] }>('list');
    return files;
  },

  /**
   * Delete a file from storage
   *
   * @param fileKey - The file key to delete
   *
   * @example
   * ```typescript
   * await storage.delete('user123/project456/image.png');
   * console.log('File deleted');
   * ```
   */
  async delete(fileKey: string): Promise<void> {
    await storageRequest('delete', { fileKey });
  },

  /**
   * Get storage usage statistics
   *
   * @returns Promise with usage stats including quota
   *
   * @example
   * ```typescript
   * const usage = await storage.getUsage();
   * console.log(`Using ${usage.usage_percent}% of quota`);
   * console.log(`${usage.file_count} files, ${usage.total_bytes} bytes`);
   * ```
   */
  async getUsage(): Promise<StorageUsage> {
    return storageRequest<StorageUsage>('usage');
  },

  /**
   * Check if storage is configured
   *
   * @returns true if LaunchPulse storage env vars are set
   */
  isConfigured(): boolean {
    return hasLaunchPulseEnv;
  },
};

// Export default and named exports
export default storage;
export { storage as Storage };
