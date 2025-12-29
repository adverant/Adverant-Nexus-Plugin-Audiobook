/**
 * Audio Assembler
 * Assembles final audiobook from generated segments
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { logger } from '../utils/logger';
import { config } from '../config';
import {
  GeneratedAudio,
  NormalizedAudio,
  AssembledAudiobook,
  AudioAssemblyParams,
  ChapterMarker
} from '../types';

export class AudioAssembler {
  private tempDir: string;
  private normalizationLUFS: number;

  constructor() {
    this.tempDir = config.audio.tempDir;
    // outputDir reserved for future file output methods
    // const outputDir = config.audio.outputDir;
    this.normalizationLUFS = config.audio.normalizationLUFS;
  }

  /**
   * Assemble complete audiobook from segments
   */
  async assembleAudiobook(params: AudioAssemblyParams): Promise<AssembledAudiobook> {
    const { project_id, audio_segments, metadata } = params;

    logger.info('Assembling audiobook', {
      project_id,
      segment_count: audio_segments.length
    });

    try {
      // Step 1: Normalize audio levels
      const normalized = await this.normalizeAudio(audio_segments);

      // Step 2: Add chapter markers
      const withMarkers = await this.addChapterMarkers(normalized, metadata);

      // Step 3: Generate MP3 and M4B formats
      const mp3 = await this.generateMP3(withMarkers, metadata);
      const m4b = await this.generateM4B(withMarkers, metadata);

      // Step 4: Calculate metrics
      const duration = this.calculateTotalDuration(normalized);
      const cost = this.calculateCost(audio_segments);

      logger.info('Audiobook assembled successfully', {
        project_id,
        duration_seconds: duration,
        total_cost: cost
      });

      return {
        mp3_file: mp3,
        m4b_file: m4b,
        total_duration: duration,
        total_cost: cost,
        chapters: withMarkers.chapters,
        metadata
      };

    } catch (error) {
      logger.error('Audiobook assembly failed', { error, project_id });
      throw error;
    }
  }

  /**
   * Normalize audio levels to target LUFS
   */
  private async normalizeAudio(segments: GeneratedAudio[]): Promise<NormalizedAudio[]> {
    logger.info('Normalizing audio levels', {
      target_lufs: this.normalizationLUFS,
      segment_count: segments.length
    });

    const normalized: NormalizedAudio[] = [];

    for (const segment of segments) {
      try {
        const tempInput = path.join(this.tempDir, `input_${Date.now()}.${segment.format}`);
        const tempOutput = path.join(this.tempDir, `output_${Date.now()}.mp3`);

        // Write input file
        await fs.writeFile(tempInput, segment.audio_data);

        // Normalize with FFmpeg
        await new Promise<void>((resolve, reject) => {
          ffmpeg(tempInput)
            .audioFilters([
              `loudnorm=I=${this.normalizationLUFS}:TP=-1.5:LRA=11`
            ])
            .audioCodec('libmp3lame')
            .audioBitrate(config.audio.bitrate)
            .audioFrequency(config.audio.sampleRate)
            .output(tempOutput)
            .on('end', () => resolve())
            .on('error', (err: Error) => reject(err))
            .run();
        });

        // Read normalized output
        const normalizedData = await fs.readFile(tempOutput);

        normalized.push({
          audio_data: normalizedData,
          format: 'mp3',
          duration: segment.duration,
          normalized_lufs: this.normalizationLUFS
        });

        // Clean up temp files
        await fs.unlink(tempInput);
        await fs.unlink(tempOutput);

      } catch (error) {
        logger.error('Audio normalization failed for segment', { error });
        throw error;
      }
    }

    return normalized;
  }

  /**
   * Add chapter markers to audio
   */
  private async addChapterMarkers(
    normalized: NormalizedAudio[],
    _metadata: any
  ): Promise<{ audio: Buffer; chapters: ChapterMarker[] }> {
    // For simplification, concatenate all segments
    const chapters: ChapterMarker[] = [];
    let currentTime = 0;

    // Combine all audio data
    const combinedAudio = Buffer.concat(normalized.map(n => n.audio_data));

    // Generate chapter markers (simplified - one marker per segment)
    normalized.forEach((segment, index) => {
      chapters.push({
        chapter_number: index + 1,
        title: `Chapter ${index + 1}`,
        start_time: currentTime,
        duration: segment.duration
      });
      currentTime += segment.duration;
    });

    return { audio: combinedAudio, chapters };
  }

  /**
   * Generate MP3 file
   */
  private async generateMP3(
    data: { audio: Buffer; chapters: ChapterMarker[] },
    _metadata: any
  ): Promise<Buffer> {
    logger.info('Generating MP3 file');

    // For simplification, return the concatenated audio
    // In production, would add ID3 tags with metadata
    return data.audio;
  }

  /**
   * Generate M4B audiobook file
   */
  private async generateM4B(
    data: { audio: Buffer; chapters: ChapterMarker[] },
    _metadata: any
  ): Promise<Buffer> {
    logger.info('Generating M4B file');

    const tempInput = path.join(this.tempDir, `input_${Date.now()}.mp3`);
    const tempOutput = path.join(this.tempDir, `output_${Date.now()}.m4b`);

    try {
      // Write input file
      await fs.writeFile(tempInput, data.audio);

      // Convert to M4B with chapter markers
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempInput)
          .audioCodec('aac')
          .audioBitrate(config.audio.bitrate)
          .audioFrequency(config.audio.sampleRate)
          .outputFormat('ipod')
          .output(tempOutput)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .run();
      });

      // Read output file
      const m4bData = await fs.readFile(tempOutput);

      // Clean up
      await fs.unlink(tempInput);
      await fs.unlink(tempOutput);

      return m4bData;

    } catch (error) {
      logger.error('M4B generation failed', { error });
      throw error;
    }
  }

  /**
   * Calculate total duration
   */
  private calculateTotalDuration(normalized: NormalizedAudio[]): number {
    return normalized.reduce((sum, audio) => sum + audio.duration, 0);
  }

  /**
   * Calculate total cost
   */
  private calculateCost(segments: GeneratedAudio[]): number {
    return segments.reduce((sum, segment) => sum + segment.cost, 0);
  }

  /**
   * Cleanup temp files
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        await fs.unlink(path.join(this.tempDir, file));
      }
      logger.info('Temp files cleaned up');
    } catch (error) {
      logger.error('Cleanup failed', { error });
    }
  }
}

export default AudioAssembler;
