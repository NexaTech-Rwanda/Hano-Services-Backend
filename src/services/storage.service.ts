import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/config';

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      throw new Error(
        'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.'
      );
    }

    supabaseClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

export interface UploadImageOptions {
  path: string; // e.g. "providers/{providerId}/avatar.jpg"
  contentType: string; // e.g. "image/jpeg"
  file: Buffer;
  bucket?: string;
}

export class StorageService {
  /**
   * Upload an image buffer to Supabase Storage.
   * Returns a public URL if bucket is public or a direct path otherwise.
   */
  static async uploadImage(options: UploadImageOptions): Promise<{ url: string; path: string }> {
    const supabase = getSupabase();
    const bucket = options.bucket || config.supabase.bucket;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(options.path, options.file, {
        contentType: options.contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload image to Supabase: ${error.message}`);
    }

    // If you configured a public CDN/base URL, build URL from it
    if (config.supabase.publicUrlBase) {
      const url = `${config.supabase.publicUrlBase}/${bucket}/${options.path}`;
      return { url, path: options.path };
    }

    // Otherwise, try to use Supabase's public URL helper (requires bucket to be public)
    const { data } = supabase.storage.from(bucket).getPublicUrl(options.path);
    const url = data.publicUrl;

    return { url, path: options.path };
  }
}

