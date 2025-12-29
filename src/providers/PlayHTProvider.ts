/**
 * PlayHT Provider Integration
 * Fallback TTS provider with 800+ voices and 100+ languages
 */

import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  Voice,
  GeneratedAudio,
  TTSGenerationParams
} from '../types';

export interface PlayHTVoice {
  id: string;
  name: string;
  gender: string;
  age: string;
  accent: string;
  language: string;
  language_code: string;
  loudness: string;
  style: string;
  tempo: string;
  texture: string;
  is_cloned: boolean;
  sample?: string;
}

export class PlayHTProvider {
  private client: AxiosInstance;
  private apiKey: string;
  private userId: string;
  private baseUrl: string;
  private costPer1K: number;

  constructor() {
    this.apiKey = config.tts.playht.apiKey;
    this.userId = config.tts.playht.userId;
    this.baseUrl = config.tts.playht.baseUrl;
    this.costPer1K = config.tts.playht.costPer1K;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-User-ID': this.userId,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    // Retry configuration
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response?.status ?? 0) >= 500;
      }
    });
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(params: TTSGenerationParams): Promise<GeneratedAudio> {
    const { text, voice_id, settings } = params;

    try {
      logger.info('Generating speech with PlayHT', {
        voice_id,
        text_length: text.length
      });

      // PlayHT uses a two-step process: request generation, then poll for completion
      const generationResponse = await this.client.post('/tts', {
        text,
        voice: voice_id,
        quality: settings?.use_speaker_boost ? 'premium' : 'standard',
        output_format: 'mp3',
        speed: 1.0,
        sample_rate: config.audio.sampleRate
      });

      const transcriptionId = generationResponse.data.id;

      // Poll for completion
      const audioUrl = await this.pollForCompletion(transcriptionId);

      // Download the audio
      const audioResponse = await axios.get(audioUrl, {
        responseType: 'arraybuffer'
      });

      const audioBuffer = Buffer.from(audioResponse.data);
      const duration = await this.estimateDuration(text);
      const cost = this.calculateCost(text.length);

      logger.info('PlayHT speech generated successfully', {
        voice_id,
        duration,
        cost,
        size_kb: (audioBuffer.length / 1024).toFixed(2)
      });

      return {
        audio_data: audioBuffer,
        format: 'mp3',
        duration,
        provider: 'playht',
        cost
      };

    } catch (error) {
      logger.error('PlayHT speech generation failed', { error, voice_id });
      throw new Error(`PlayHT generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all available voices
   */
  async listVoices(): Promise<Voice[]> {
    try {
      logger.info('Fetching PlayHT voice library');

      const response = await this.client.get<PlayHTVoice[]>('/voices');

      const voices: Voice[] = response.data.map(v => ({
        id: v.id,
        name: v.name,
        provider: 'playht',
        gender: this.parseGender(v.gender),
        age_range: this.parseAgeRange(v.age),
        accent: v.accent || 'neutral',
        descriptors: this.extractDescriptors(v),
        sample_url: v.sample
      }));

      logger.info(`Retrieved ${voices.length} voices from PlayHT`);
      return voices;

    } catch (error) {
      logger.error('Failed to list PlayHT voices', { error });
      throw new Error('Failed to fetch PlayHT voice library');
    }
  }

  /**
   * Poll for TTS generation completion
   */
  private async pollForCompletion(transcriptionId: string, maxAttempts: number = 30): Promise<string> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await this.client.get(`/tts/${transcriptionId}`);
        const status = response.data.status;

        if (status === 'complete') {
          return response.data.output.url;
        } else if (status === 'failed') {
          throw new Error('PlayHT generation failed');
        }

        // Wait 2 seconds before next poll
        await this.sleep(2000);
        attempts++;

      } catch (error) {
        logger.error('Error polling PlayHT status', { error, transcriptionId });
        throw error;
      }
    }

    throw new Error('PlayHT generation timed out');
  }

  /**
   * Parse gender from PlayHT format
   */
  private parseGender(gender: string): 'male' | 'female' | 'neutral' {
    const g = gender.toLowerCase();
    if (g === 'male' || g === 'female') {
      return g;
    }
    return 'neutral';
  }

  /**
   * Parse age range from PlayHT format
   */
  private parseAgeRange(age: string): '0-12' | '13-19' | '20-35' | '36-55' | '56+' {
    const a = age.toLowerCase();

    if (a.includes('young') || a.includes('child')) return '0-12';
    if (a.includes('teen') || a.includes('youth')) return '13-19';
    if (a.includes('middle') || a.includes('mature')) return '36-55';
    if (a.includes('old') || a.includes('senior')) return '56+';

    return '20-35';
  }

  /**
   * Extract descriptive tags
   */
  private extractDescriptors(voice: PlayHTVoice): string[] {
    const descriptors: string[] = [];

    if (voice.style) descriptors.push(voice.style);
    if (voice.texture) descriptors.push(voice.texture);
    if (voice.tempo) descriptors.push(voice.tempo);
    if (voice.loudness) descriptors.push(voice.loudness);

    return descriptors;
  }

  /**
   * Estimate audio duration
   */
  private async estimateDuration(text: string): Promise<number> {
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = 150;
    const durationMinutes = wordCount / wordsPerMinute;
    return Math.ceil(durationMinutes * 60);
  }

  /**
   * Calculate cost based on character count
   */
  private calculateCost(characterCount: number): number {
    return (characterCount / 1000) * this.costPer1K;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for PlayHT service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/voices', { params: { limit: 1 } });
      return true;
    } catch (error) {
      logger.error('PlayHT health check failed', { error });
      return false;
    }
  }
}

export default PlayHTProvider;
