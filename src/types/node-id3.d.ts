/**
 * Type definitions for node-id3 v0.2.x
 *
 * Since @types/node-id3 doesn't exist in npm registry,
 * we provide minimal type definitions for the subset of
 * node-id3 API that we use in this service.
 */

declare module 'node-id3' {
  export interface Tags {
    title?: string;
    artist?: string;
    album?: string;
    year?: string | number;
    comment?: {
      language?: string;
      text?: string;
    };
    trackNumber?: string | number;
    genre?: string;
    composer?: string;
    originalArtist?: string;
    copyright?: string;
    url?: string;
    encodedBy?: string;
    image?: string | Buffer | { mime: string; type: { id: number; name: string }; description: string; imageBuffer: Buffer };
    userDefinedText?: Array<{ description: string; value: string }>;
    unsynchronisedLyrics?: { language: string; text: string };
    synchronisedLyrics?: Array<{ language: string; timeStampFormat: number; contentType: number; shortText: string; data: Array<{ timeStamp: number; text: string }> }>;
  }

  export interface WriteOptions {
    include?: string[];
    exclude?: string[];
    strict?: boolean;
  }

  export function read(filepath: string, options?: { onlyRaw?: boolean; noRaw?: boolean }): Tags | null;
  export function write(tags: Tags, filepath: string, options?: WriteOptions): boolean;
  export function create(tags: Tags): Buffer;
  export function update(tags: Tags, filepath: string, options?: WriteOptions): boolean;
  export function remove(filepath: string): boolean;
}
