/**
 * ElevenLabs TTS Provider Integration
 * Primary provider with 1200+ voices and multilingual support
 */

import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  Voice,
  VoiceSettings,
  EmotionContext,
  GeneratedAudio,
  TTSGenerationParams,
  ClonedVoice
} from '../types';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels: Record<string, string>;
  category?: string;
  description?: string;
  preview_url?: string;
}

export class ElevenLabsProvider {
  private client: AxiosInstance;
  private apiKey: string;
  private modelId: string;
  private baseUrl: string;
  private costPer1K: number;

  constructor() {
    this.apiKey = config.tts.elevenlabs.apiKey;
    this.modelId = config.tts.elevenlabs.modelId;
    this.baseUrl = config.tts.elevenlabs.baseUrl;
    this.costPer1K = config.tts.elevenlabs.costPer1K;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 seconds
    });

    // Retry on network errors and 5xx responses
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
   * Generate speech from text using ElevenLabs API
   */
  async generateSpeech(params: TTSGenerationParams): Promise<GeneratedAudio> {
    const { text, voice_id, settings, emotion } = params;

    try {
      // Apply emotion modulation to voice settings
      const adjustedSettings = this.applyEmotionModulation(
        settings || this.getDefaultSettings(),
        emotion
      );

      logger.info('Generating speech with ElevenLabs', {
        voice_id,
        text_length: text.length,
        emotion: emotion?.type
      });

      const response = await this.client.post(
        `/text-to-speech/${voice_id}`,
        {
          text,
          model_id: params.model || this.modelId,
          voice_settings: adjustedSettings
        },
        {
          responseType: 'arraybuffer',
          headers: {
            'Accept': 'audio/mpeg'
          }
        }
      );

      const audioBuffer = Buffer.from(response.data);
      const duration = await this.estimateDuration(text);
      const cost = this.calculateCost(text.length);

      logger.info('Speech generated successfully', {
        voice_id,
        duration,
        cost,
        size_kb: (audioBuffer.length / 1024).toFixed(2)
      });

      return {
        audio_data: audioBuffer,
        format: 'mp3',
        duration,
        provider: 'elevenlabs',
        cost
      };

    } catch (error) {
      logger.error('ElevenLabs speech generation failed', { error, voice_id });
      throw new Error(`ElevenLabs generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all available voices from ElevenLabs
   */
  async listVoices(): Promise<Voice[]> {
    try {
      logger.info('Fetching ElevenLabs voice library');

      const response = await this.client.get<{ voices: ElevenLabsVoice[] }>('/voices');

      const voices: Voice[] = response.data.voices.map(v => ({
        id: v.voice_id,
        name: v.name,
        provider: 'elevenlabs',
        gender: this.detectGender(v.labels),
        age_range: this.detectAgeRange(v.labels),
        accent: v.labels.accent || 'neutral',
        descriptors: this.extractDescriptors(v.labels),
        sample_url: v.preview_url
      }));

      logger.info(`Retrieved ${voices.length} voices from ElevenLabs`);
      return voices;

    } catch (error) {
      logger.error('Failed to list ElevenLabs voices', { error });
      throw new Error('Failed to fetch voice library');
    }
  }

  /**
   * Clone a voice from audio samples
   */
  async cloneVoice(
    name: string,
    audioSamples: Buffer[],
    description?: string
  ): Promise<ClonedVoice> {
    try {
      logger.info('Cloning voice with ElevenLabs', {
        name,
        sample_count: audioSamples.length
      });

      const FormData = require('form-data');
      const formData = new FormData();

      formData.append('name', name);
      if (description) {
        formData.append('description', description);
      }

      audioSamples.forEach((sample, index) => {
        formData.append('files', sample, {
          filename: `sample_${index}.wav`,
          contentType: 'audio/wav'
        });
      });

      const response = await this.client.post('/voices/add', formData, {
        headers: formData.getHeaders()
      });

      const voiceId = response.data.voice_id;

      logger.info('Voice cloned successfully', { voice_id: voiceId, name });

      return {
        voice_id: voiceId,
        voice_name: name,
        provider: 'elevenlabs',
        quality_score: 0.9 // ElevenLabs typically produces high-quality clones
      };

    } catch (error) {
      logger.error('Voice cloning failed', { error, name });
      throw new Error('Voice cloning failed');
    }
  }

  /**
   * Apply emotion modulation to voice settings
   */
  private applyEmotionModulation(
    baseSettings: VoiceSettings,
    emotion?: EmotionContext
  ): VoiceSettings {
    if (!emotion) return baseSettings;

    const modulated = { ...baseSettings };

    switch (emotion.type) {
      case 'joy':
        modulated.stability = Math.max(0.4, baseSettings.stability - 0.1);
        modulated.style = 0.7;
        break;
      case 'fear':
        modulated.stability = Math.min(0.9, baseSettings.stability + 0.2);
        modulated.similarity_boost = Math.min(1.0, baseSettings.similarity_boost + 0.1);
        break;
      case 'anger':
        modulated.stability = Math.max(0.3, baseSettings.stability - 0.2);
        modulated.style = 0.9;
        modulated.use_speaker_boost = true;
        break;
      case 'sadness':
        modulated.stability = Math.min(0.85, baseSettings.stability + 0.15);
        modulated.style = 0.3;
        break;
      case 'surprise':
        modulated.stability = Math.max(0.35, baseSettings.stability - 0.15);
        modulated.style = 0.8;
        break;
      case 'disgust':
        modulated.stability = 0.6;
        modulated.style = 0.6;
        break;
      case 'neutral':
      default:
        // No modulation for neutral
        break;
    }

    // Apply intensity scaling
    const intensityFactor = emotion.intensity || 0.5;
    if (modulated.style) {
      modulated.style = modulated.style * intensityFactor;
    }

    return modulated;
  }

  /**
   * Get default voice settings
   */
  private getDefaultSettings(): VoiceSettings {
    return {
      stability: 0.65,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true
    };
  }

  /**
   * Detect gender from voice labels
   */
  private detectGender(labels: Record<string, string>): 'male' | 'female' | 'neutral' {
    const gender = labels.gender?.toLowerCase();
    if (gender === 'male' || gender === 'female') {
      return gender;
    }
    return 'neutral';
  }

  /**
   * Detect age range from voice labels
   */
  private detectAgeRange(labels: Record<string, string>): '0-12' | '13-19' | '20-35' | '36-55' | '56+' {
    const age = labels.age?.toLowerCase();

    if (!age) return '20-35'; // Default

    if (age.includes('young') || age.includes('child')) return '0-12';
    if (age.includes('teen') || age.includes('youth')) return '13-19';
    if (age.includes('middle') || age.includes('mature')) return '36-55';
    if (age.includes('old') || age.includes('senior')) return '56+';

    return '20-35';
  }

  /**
   * Extract descriptive tags from labels
   */
  private extractDescriptors(labels: Record<string, string>): string[] {
    const descriptors: string[] = [];

    if (labels.descriptive) {
      descriptors.push(labels.descriptive);
    }
    if (labels.use_case) {
      descriptors.push(labels.use_case);
    }
    if (labels.accent && labels.accent !== 'neutral') {
      descriptors.push(labels.accent);
    }

    return descriptors;
  }

  /**
   * Estimate audio duration from text length
   * Average speaking rate: 150 words per minute
   */
  private async estimateDuration(text: string): Promise<number> {
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = 150;
    const durationMinutes = wordCount / wordsPerMinute;
    return Math.ceil(durationMinutes * 60); // Convert to seconds
  }

  /**
   * Calculate cost based on character count
   */
  private calculateCost(characterCount: number): number {
    return (characterCount / 1000) * this.costPer1K;
  }

  /**
   * Health check for ElevenLabs service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/user');
      return true;
    } catch (error) {
      logger.error('ElevenLabs health check failed', { error });
      return false;
    }
  }
}

export default ElevenLabsProvider;
