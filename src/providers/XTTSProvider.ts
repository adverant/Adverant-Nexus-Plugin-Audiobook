/**
 * XTTS-v2 Provider Integration
 * Open-source voice cloning with 6-second samples
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  GeneratedAudio,
  TTSGenerationParams,
  ClonedVoice
} from '../types';

export interface XTTSVoiceProfile {
  embedding: string; // Base64 encoded speaker embedding
  language: string;
  quality_score: number;
}

export class XTTSProvider {
  private client: AxiosInstance;
  private baseUrl: string;
  private enabled: boolean;
  private costPer1K: number;

  constructor() {
    this.baseUrl = config.tts.xtts.baseUrl;
    this.enabled = config.tts.xtts.enabled;
    this.costPer1K = config.tts.xtts.costPer1K;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 120000, // 120 seconds for voice cloning
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Check if XTTS is enabled and available
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Clone a voice from audio sample (minimum 6 seconds)
   */
  async cloneVoice(
    audioSample: Buffer,
    voiceName: string,
    language: string = 'en'
  ): Promise<ClonedVoice> {
    if (!this.enabled) {
      throw new Error('XTTS provider is not enabled');
    }

    try {
      logger.info('Cloning voice with XTTS-v2', {
        voice_name: voiceName,
        language,
        sample_size_kb: (audioSample.length / 1024).toFixed(2)
      });

      const FormData = require('form-data');
      const formData = new FormData();

      formData.append('audio', audioSample, {
        filename: 'voice_sample.wav',
        contentType: 'audio/wav'
      });
      formData.append('language', language);
      formData.append('voice_name', voiceName);

      const response = await this.client.post('/clone', formData, {
        headers: formData.getHeaders()
      });

      const voiceProfile: XTTSVoiceProfile = response.data;

      logger.info('Voice cloned successfully with XTTS', {
        voice_name: voiceName,
        quality_score: voiceProfile.quality_score
      });

      return {
        voice_id: voiceProfile.embedding, // Embedding serves as voice_id
        voice_name: voiceName,
        provider: 'xtts',
        quality_score: voiceProfile.quality_score
      };

    } catch (error) {
      logger.error('XTTS voice cloning failed', { error, voice_name: voiceName });
      throw new Error(`XTTS voice cloning failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate speech using cloned voice
   */
  async generateSpeech(params: TTSGenerationParams): Promise<GeneratedAudio> {
    if (!this.enabled) {
      throw new Error('XTTS provider is not enabled');
    }

    const { text, voice_id } = params;

    try {
      logger.info('Generating speech with XTTS', {
        text_length: text.length
      });

      const response = await this.client.post(
        '/tts',
        {
          text,
          speaker_wav: voice_id, // This is the embedding from cloneVoice
          language: 'en'
        },
        {
          responseType: 'arraybuffer'
        }
      );

      const audioBuffer = Buffer.from(response.data);
      const duration = await this.estimateDuration(text);
      const cost = this.calculateCost(text.length);

      logger.info('XTTS speech generated successfully', {
        duration,
        cost,
        size_kb: (audioBuffer.length / 1024).toFixed(2)
      });

      return {
        audio_data: audioBuffer,
        format: 'wav',
        duration,
        provider: 'xtts',
        cost
      };

    } catch (error) {
      logger.error('XTTS speech generation failed', { error });
      throw new Error(`XTTS generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cross-language voice cloning
   * Clone voice characteristics to a different language
   */
  async crossLanguageClone(
    voiceProfile: XTTSVoiceProfile,
    targetLanguage: string
  ): Promise<ClonedVoice> {
    if (!this.enabled) {
      throw new Error('XTTS provider is not enabled');
    }

    try {
      logger.info('Performing cross-language voice cloning', {
        source_language: voiceProfile.language,
        target_language: targetLanguage
      });

      const response = await this.client.post('/clone/cross-language', {
        speaker_embedding: voiceProfile.embedding,
        target_language: targetLanguage
      });

      const clonedProfile: XTTSVoiceProfile = response.data;

      return {
        voice_id: clonedProfile.embedding,
        voice_name: `cross_lang_${targetLanguage}`,
        provider: 'xtts',
        quality_score: clonedProfile.quality_score
      };

    } catch (error) {
      logger.error('Cross-language cloning failed', { error });
      throw new Error('Cross-language cloning failed');
    }
  }

  /**
   * Estimate audio duration from text length
   */
  private async estimateDuration(text: string): Promise<number> {
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = 150;
    const durationMinutes = wordCount / wordsPerMinute;
    return Math.ceil(durationMinutes * 60);
  }

  /**
   * Calculate cost (XTTS is self-hosted, so cost is $0)
   */
  private calculateCost(characterCount: number): number {
    return (characterCount / 1000) * this.costPer1K; // $0 for self-hosted
  }

  /**
   * Health check for XTTS service
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.error('XTTS health check failed', { error });
      return false;
    }
  }
}

export default XTTSProvider;
