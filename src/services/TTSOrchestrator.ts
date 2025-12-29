/**
 * TTS Orchestrator
 * Coordinates multiple TTS providers for audiobook generation
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { config } from '../config';
import ElevenLabsProvider from '../providers/ElevenLabsProvider';
import XTTSProvider from '../providers/XTTSProvider';
import PlayHTProvider from '../providers/PlayHTProvider';
import {
  AudioSegment,
  GeneratedAudio,
  VoiceAssignment,
  Chapter,
  AudiobookProject,
  GenerationParams,
  TTSGenerationParams,
  ProgressUpdate
} from '../types';

export class TTSOrchestrator {
  private elevenlabs: ElevenLabsProvider;
  private xtts: XTTSProvider;
  private playht: PlayHTProvider;
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
    this.elevenlabs = new ElevenLabsProvider();
    this.xtts = new XTTSProvider();
    this.playht = new PlayHTProvider();
  }

  /**
   * Generate complete audiobook from chapters
   */
  async generateAudiobook(
    params: GenerationParams,
    progressCallback?: (update: ProgressUpdate) => void
  ): Promise<AudiobookProject> {
    const { project_id, chapters, voice_assignments } = params;

    logger.info('Starting audiobook generation', {
      project_id,
      chapter_count: chapters.length,
      voice_count: voice_assignments.length
    });

    try {
      // Step 1: Split chapters into segments
      progressCallback?.({
        stage: 'analyzing_chapters',
        percent_complete: 5,
        message: 'Analyzing chapters and splitting into segments'
      });

      const segments = await this.segmentChapters(chapters);

      // Step 2: Generate audio for each segment
      progressCallback?.({
        stage: 'generating_audio',
        percent_complete: 10,
        total_segments: segments.length,
        current_segment: 0,
        message: 'Generating audio segments'
      });

      const audioSegments = await this.generateSegments(
        segments,
        voice_assignments,
        (current, total) => {
          const percent = 10 + ((current / total) * 80);
          progressCallback?.({
            stage: 'generating_audio',
            percent_complete: Math.round(percent),
            current_segment: current,
            total_segments: total,
            message: `Generating segment ${current}/${total}`
          });
        }
      );

      // Step 3: Save results and return project status
      progressCallback?.({
        stage: 'finalizing',
        percent_complete: 95,
        message: 'Finalizing audiobook project'
      });

      await this.saveAudioSegments(project_id, audioSegments);

      progressCallback?.({
        stage: 'complete',
        percent_complete: 100,
        message: 'Audiobook generation complete'
      });

      // Fetch updated project
      const project = await this.getAudiobookProject(project_id);
      return project!;

    } catch (error) {
      logger.error('Audiobook generation failed', { error, project_id });
      progressCallback?.({
        stage: 'error',
        percent_complete: 0,
        message: `Generation failed: ${error instanceof Error ? error.message : String(error)}`
      });
      throw error;
    }
  }

  /**
   * Segment chapters into dialogue and narrative parts
   */
  private async segmentChapters(chapters: Chapter[]): Promise<AudioSegment[]> {
    const segments: AudioSegment[] = [];

    for (const chapter of chapters) {
      // Simple segmentation: split by paragraphs
      const paragraphs = chapter.content.split(/\n\n+/);

      paragraphs.forEach((paragraph, index) => {
        if (paragraph.trim()) {
          const isDialogue = this.detectDialogue(paragraph);
          const characterName = isDialogue ? this.extractCharacterName(paragraph) : null;

          segments.push({
            id: `${chapter.id}_seg_${index}`,
            sequence_number: index + 1,
            segment_type: isDialogue ? 'dialogue' : 'narrative',
            character_name: characterName,
            text_content: paragraph.trim(),
            emotion_detected: null, // TODO: Implement emotion detection
            emotion_intensity: null
          });
        }
      });
    }

    logger.info(`Segmented ${chapters.length} chapters into ${segments.length} segments`);
    return segments;
  }

  /**
   * Generate audio for all segments
   */
  private async generateSegments(
    segments: AudioSegment[],
    assignments: VoiceAssignment[],
    progressCallback?: (current: number, total: number) => void
  ): Promise<GeneratedAudio[]> {
    const results: GeneratedAudio[] = [];
    const batchSize = config.concurrency.batchSize;

    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(segment => this.generateSingleSegment(segment, assignments))
      );

      results.push(...batchResults);
      progressCallback?.(i + batch.length, segments.length);
    }

    return results;
  }

  /**
   * Generate audio for a single segment
   */
  private async generateSingleSegment(
    segment: AudioSegment,
    assignments: VoiceAssignment[]
  ): Promise<GeneratedAudio> {
    const assignment = this.findVoiceAssignment(segment.character_name, assignments);

    if (!assignment) {
      throw new Error(`No voice assignment found for segment: ${segment.id}`);
    }

    const params: TTSGenerationParams = {
      text: segment.text_content,
      voice_id: assignment.voice_id,
      settings: assignment.voice_settings,
      emotion: segment.emotion_detected ? {
        type: segment.emotion_detected,
        intensity: segment.emotion_intensity || 0.5
      } : undefined
    };

    try {
      // Try primary provider (ElevenLabs)
      return await this.elevenlabs.generateSpeech(params);
    } catch (error) {
      logger.warn('Primary provider failed, trying fallback', { error });

      try {
        // Fallback to PlayHT
        return await this.playht.generateSpeech(params);
      } catch (fallbackError) {
        logger.error('All providers failed for segment', {
          segment_id: segment.id,
          error: fallbackError
        });
        throw new Error('Failed to generate audio for segment');
      }
    }
  }

  /**
   * Find voice assignment for character
   */
  private findVoiceAssignment(
    characterName: string | null,
    assignments: VoiceAssignment[]
  ): VoiceAssignment | undefined {
    if (!characterName) {
      // Use narrator voice for non-dialogue
      return assignments.find(a => a.character_name === 'narrator');
    }

    return assignments.find(a =>
      a.character_name.toLowerCase() === characterName.toLowerCase()
    );
  }

  /**
   * Detect if text contains dialogue
   */
  private detectDialogue(text: string): boolean {
    // Simple heuristic: contains quotes and dialogue tags
    return /[""].*[""]/.test(text) && /(said|asked|replied|whispered|shouted)/.test(text);
  }

  /**
   * Extract character name from dialogue
   */
  private extractCharacterName(text: string): string | null {
    // Extract name before "said", "asked", etc.
    const match = text.match(/(\w+)\s+(said|asked|replied|whispered|shouted)/i);
    return match ? match[1] : null;
  }

  /**
   * Save audio segments to database
   */
  private async saveAudioSegments(
    projectId: string,
    audioSegments: GeneratedAudio[]
  ): Promise<void> {
    // TODO: Implement database save logic
    logger.info('Saving audio segments', {
      project_id: projectId,
      segment_count: audioSegments.length
    });
  }

  /**
   * Get audiobook project from database
   */
  private async getAudiobookProject(projectId: string): Promise<AudiobookProject | null> {
    const result = await this.db.query(
      'SELECT * FROM prose.audiobook_projects WHERE project_id = $1',
      [projectId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      project_id: row.project_id,
      narrator_voice_id: row.narrator_voice_id,
      audio_quality: row.audio_quality,
      format: row.format,
      status: row.status,
      total_duration_seconds: row.total_duration_seconds,
      file_size_mb: row.file_size_mb ? parseFloat(row.file_size_mb) : null,
      chapter_count: row.chapter_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
      completed_at: row.completed_at
    };
  }

  /**
   * Health check for all providers
   */
  async healthCheck(): Promise<{
    elevenlabs: boolean;
    xtts: boolean;
    playht: boolean;
  }> {
    return {
      elevenlabs: await this.elevenlabs.healthCheck(),
      xtts: await this.xtts.healthCheck(),
      playht: await this.playht.healthCheck()
    };
  }
}

export default TTSOrchestrator;
