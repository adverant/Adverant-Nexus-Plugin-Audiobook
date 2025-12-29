/**
 * Voice Matching Engine
 * Matches characters to optimal voices based on Character Bible attributes
 */

import { logger } from '../utils/logger';
import {
  Voice,
  VoiceMatch,
  VoiceMatchingParams,
  VoiceProfile,
  VoiceSettings,
  CharacterBible,
  AgeRange
} from '../types';

export class VoiceMatchingEngine {
  /**
   * Match a character to the best available voice
   */
  async matchCharacterToVoice(params: VoiceMatchingParams): Promise<VoiceMatch> {
    const { character_bible, available_voices } = params;

    logger.info('Matching character to voice', {
      character: character_bible.character_name,
      available_voices_count: available_voices.length
    });

    // Step 1: Filter by gender
    let candidates = this.filterByGender(available_voices, character_bible.gender);
    logger.debug(`After gender filter: ${candidates.length} candidates`);

    // Step 2: Filter by age range
    candidates = this.filterByAgeRange(candidates, character_bible.age);
    logger.debug(`After age filter: ${candidates.length} candidates`);

    // Step 3: Filter by accent (if specified)
    if (character_bible.voice_profile.accent) {
      candidates = this.filterByAccent(candidates, character_bible.voice_profile.accent);
      logger.debug(`After accent filter: ${candidates.length} candidates`);
    }

    // Step 4: Score remaining candidates by personality match
    const scored = candidates.map(voice => ({
      voice,
      score: this.calculatePersonalityMatch(
        voice.descriptors,
        character_bible.voice_profile.tone
      )
    }));

    // Step 5: Sort by score and select best match
    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      throw new Error(`No suitable voice found for character: ${character_bible.character_name}`);
    }

    const best = scored[0];

    logger.info('Voice match found', {
      character: character_bible.character_name,
      voice: best.voice.name,
      provider: best.voice.provider,
      match_score: best.score
    });

    return {
      voice_id: best.voice.id,
      voice_name: best.voice.name,
      provider: best.voice.provider,
      match_score: best.score,
      voice_settings: this.optimizeSettings(best.voice, character_bible.voice_profile)
    };
  }

  /**
   * Filter voices by gender
   */
  private filterByGender(
    voices: Voice[],
    gender: 'male' | 'female' | 'neutral'
  ): Voice[] {
    return voices.filter(v =>
      v.gender === gender || v.gender === 'neutral'
    );
  }

  /**
   * Filter voices by age range
   */
  private filterByAgeRange(voices: Voice[], age: number): Voice[] {
    const targetRange = this.getAgeRangeFromAge(age);

    return voices.filter(v => {
      // Exact match or adjacent ranges are acceptable
      return v.age_range === targetRange ||
             this.areAdjacentAgeRanges(v.age_range, targetRange);
    });
  }

  /**
   * Filter voices by accent
   */
  private filterByAccent(voices: Voice[], accent: string): Voice[] {
    const normalizedAccent = accent.toLowerCase();

    return voices.filter(v => {
      const voiceAccent = v.accent.toLowerCase();
      return voiceAccent === normalizedAccent ||
             voiceAccent === 'neutral' ||
             voiceAccent === 'american'; // Default fallback
    });
  }

  /**
   * Calculate personality match score
   */
  private calculatePersonalityMatch(
    voiceDescriptors: string[],
    characterTone: string[]
  ): number {
    if (characterTone.length === 0 || voiceDescriptors.length === 0) {
      return 0.5; // Neutral score
    }

    let matchCount = 0;
    const normalizedTone = characterTone.map(t => t.toLowerCase());
    const normalizedDescriptors = voiceDescriptors.map(d => d.toLowerCase());

    for (const tone of normalizedTone) {
      for (const descriptor of normalizedDescriptors) {
        if (descriptor.includes(tone) || tone.includes(descriptor)) {
          matchCount++;
        }
      }
    }

    // Calculate score based on overlap
    const maxMatches = Math.max(normalizedTone.length, normalizedDescriptors.length);
    const score = matchCount / maxMatches;

    return Math.min(1.0, score); // Cap at 1.0
  }

  /**
   * Optimize voice settings for character profile
   */
  private optimizeSettings(_voice: Voice, profile: VoiceProfile): VoiceSettings {
    const settings: VoiceSettings = {
      stability: 0.65,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true
    };

    // Adjust stability based on emotional range
    switch (profile.emotional_range) {
      case 'low':
        settings.stability = 0.8;
        settings.style = 0.3;
        break;
      case 'medium':
        settings.stability = 0.65;
        settings.style = 0.5;
        break;
      case 'high':
        settings.stability = 0.5;
        settings.style = 0.8;
        break;
    }

    // Adjust based on tone keywords
    if (profile.tone.some(t => ['calm', 'serene', 'gentle'].includes(t.toLowerCase()))) {
      settings.stability = Math.min(0.85, settings.stability + 0.1);
    }

    if (profile.tone.some(t => ['energetic', 'dynamic', 'lively'].includes(t.toLowerCase()))) {
      settings.stability = Math.max(0.4, settings.stability - 0.15);
      settings.style = 0.8;
    }

    return settings;
  }

  /**
   * Convert age to age range
   */
  private getAgeRangeFromAge(age: number): AgeRange {
    if (age <= 12) return '0-12';
    if (age <= 19) return '13-19';
    if (age <= 35) return '20-35';
    if (age <= 55) return '36-55';
    return '56+';
  }

  /**
   * Check if two age ranges are adjacent
   */
  private areAdjacentAgeRanges(range1: AgeRange, range2: AgeRange): boolean {
    const ranges: AgeRange[] = ['0-12', '13-19', '20-35', '36-55', '56+'];
    const index1 = ranges.indexOf(range1);
    const index2 = ranges.indexOf(range2);

    return Math.abs(index1 - index2) === 1;
  }

  /**
   * Batch match multiple characters to voices
   */
  async batchMatchCharactersToVoices(
    characters: CharacterBible[],
    available_voices: Voice[]
  ): Promise<VoiceMatch[]> {
    logger.info('Batch matching characters', {
      character_count: characters.length,
      voice_pool_size: available_voices.length
    });

    const matches: VoiceMatch[] = [];

    for (const character of characters) {
      try {
        const match = await this.matchCharacterToVoice({
          character_bible: character,
          available_voices
        });
        matches.push(match);
      } catch (error) {
        logger.error('Failed to match character', {
          character: character.character_name,
          error
        });
        // Continue with other characters
      }
    }

    return matches;
  }
}

export default VoiceMatchingEngine;
