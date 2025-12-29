/**
 * Type Definitions for NexusProseCreator-Audiobook
 */

// ============================================================================
// Audio Segment Types
// ============================================================================

export interface AudioSegment {
  id: string;
  sequence_number: number;
  segment_type: 'narrative' | 'dialogue';
  character_name: string | null;
  text_content: string;
  emotion_detected: EmotionType | null;
  emotion_intensity: number | null; // 0.0 to 1.0
}

export type EmotionType = 'joy' | 'fear' | 'anger' | 'sadness' | 'neutral' | 'surprise' | 'disgust';

export interface EmotionContext {
  type: EmotionType;
  intensity: number; // 0.0 to 1.0
}

// ============================================================================
// Voice Types
// ============================================================================

export interface Voice {
  id: string;
  name: string;
  provider: TTSProvider;
  gender: 'male' | 'female' | 'neutral';
  age_range: AgeRange;
  accent: string;
  descriptors: string[];
  sample_url?: string;
}

export type TTSProvider = 'elevenlabs' | 'xtts' | 'playht';
export type AgeRange = '0-12' | '13-19' | '20-35' | '36-55' | '56+';

export interface VoiceSettings {
  stability: number; // 0.0 to 1.0
  similarity_boost: number; // 0.0 to 1.0
  style?: number; // 0.0 to 1.0
  use_speaker_boost?: boolean;
}

export interface VoiceProfile {
  gender: 'male' | 'female' | 'neutral';
  age_range: AgeRange;
  accent?: string;
  tone: string[];
  emotional_range: 'low' | 'medium' | 'high';
}

export interface VoiceAssignment {
  character_name: string;
  voice_id: string;
  voice_name: string;
  provider: TTSProvider;
  match_score: number;
  voice_settings: VoiceSettings;
}

export interface VoiceMatch {
  voice_id: string;
  voice_name: string;
  provider: TTSProvider;
  match_score: number;
  voice_settings: VoiceSettings;
}

export interface ClonedVoice {
  voice_id: string;
  voice_name: string;
  provider: TTSProvider;
  quality_score: number;
}

// ============================================================================
// Chapter & Content Types
// ============================================================================

export interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
}

export interface CharacterBible {
  character_name: string;
  age: number;
  gender: 'male' | 'female' | 'neutral';
  personality: string[];
  background: string;
  speaking_style: string;
  voice_profile: VoiceProfile;
}

// ============================================================================
// Generated Audio Types
// ============================================================================

export interface GeneratedAudio {
  audio_data: Buffer;
  format: 'mp3' | 'wav' | 'm4b';
  duration: number; // seconds
  provider: TTSProvider;
  cost: number; // dollars
}

export interface NormalizedAudio {
  audio_data: Buffer;
  format: 'mp3' | 'wav';
  duration: number;
  normalized_lufs: number;
}

// ============================================================================
// Audiobook Project Types
// ============================================================================

export interface AudiobookProject {
  id: string;
  project_id: string;
  narrator_voice_id: string | null;
  audio_quality: 'standard' | 'high' | 'premium';
  format: 'm4b' | 'mp3';
  status: 'pending' | 'processing' | 'complete' | 'failed';
  total_duration_seconds: number;
  file_size_mb: number | null;
  chapter_count: number;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface AudiobookChapter {
  id: string;
  audiobook_project_id: string;
  chapter_number: number;
  audio_url: string;
  duration_seconds: number;
  file_size_mb: number | null;
  word_count: number | null;
  status: string;
  created_at: Date;
}

export interface AudiobookMetadata {
  title: string;
  subtitle?: string;
  author: string;
  narrator: string;
  series?: string;
  series_number?: number;
  publication_date: Date;
  publisher: string;
  isbn?: string;
  language: string;
  duration_seconds: number;
}

export interface AssembledAudiobook {
  mp3_file: Buffer | null;
  m4b_file: Buffer | null;
  total_duration: number;
  total_cost: number;
  chapters: ChapterMarker[];
  metadata: AudiobookMetadata;
}

export interface ChapterMarker {
  chapter_number: number;
  title: string;
  start_time: number; // seconds
  duration: number; // seconds
}

// ============================================================================
// Generation Parameters
// ============================================================================

export interface GenerationParams {
  project_id: string;
  chapters: Chapter[];
  voice_assignments: VoiceAssignment[];
  narrator_voice_id?: string;
  audio_quality?: 'standard' | 'high' | 'premium';
  format?: 'm4b' | 'mp3';
}

export interface TTSGenerationParams {
  text: string;
  voice_id: string;
  model?: string;
  settings?: VoiceSettings;
  emotion?: EmotionContext;
}

// ============================================================================
// Voice Matching Parameters
// ============================================================================

export interface VoiceMatchingParams {
  character_bible: CharacterBible;
  available_voices: Voice[];
}

export interface VoiceSearchParams {
  gender?: 'male' | 'female' | 'neutral';
  age_range?: AgeRange;
  accent?: string;
  personality?: string[];
  provider?: TTSProvider;
}

// ============================================================================
// Audio Assembly Parameters
// ============================================================================

export interface AudioAssemblyParams {
  project_id: string;
  audio_segments: GeneratedAudio[];
  metadata: AudiobookMetadata;
}

// ============================================================================
// Cost & Usage Tracking
// ============================================================================

export interface UsageStats {
  provider: TTSProvider;
  characters_generated: number;
  api_calls: number;
  cost_dollars: number;
}

export interface CostEstimate {
  estimated_characters: number;
  estimated_duration_hours: number;
  elevenlabs_cost: number;
  xtts_cost: number;
  playht_cost: number;
  recommended_provider: TTSProvider;
  total_cost: number;
}

// ============================================================================
// WebSocket Progress Types
// ============================================================================

export interface ProgressUpdate {
  stage: ProgressStage;
  percent_complete: number;
  current_chapter?: number;
  total_chapters?: number;
  current_segment?: number;
  total_segments?: number;
  message: string;
}

export type ProgressStage =
  | 'analyzing_chapters'
  | 'matching_voices'
  | 'generating_audio'
  | 'assembling_audiobook'
  | 'finalizing'
  | 'complete'
  | 'error';

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateAudiobookRequest {
  projectId: string;
  narratorPreference?: 'author_clone' | 'professional' | 'auto_select';
  authorVoiceSample?: Buffer;
  audioQuality?: 'standard' | 'high' | 'premium';
  includeMusic?: boolean;
  includeSFX?: boolean;
  outputFormat?: 'm4b' | 'mp3' | 'both';
}

export interface CreateAudiobookResponse {
  audiobookProjectId: string;
  estimatedDuration: number;
  estimatedCost: number;
  characterVoicesCount: number;
}

export interface VoiceAssignmentRequest {
  autoAssign: boolean;
  manualOverrides?: Array<{
    characterName: string;
    voiceProvider: TTSProvider;
    voiceId: string;
  }>;
}

export interface VoiceAssignmentResponse {
  voiceAssignments: VoiceAssignment[];
  previewUrls: string[];
}

export interface GenerateAudiobookRequest {
  chapters?: number[];
  streamProgress?: boolean;
}

export interface GenerateAudiobookResponse {
  taskId: string;
  streamingUrl?: string;
  pollUrl: string;
}

export interface AudiobookStatusResponse {
  status: 'pending' | 'processing' | 'complete' | 'failed';
  progress: {
    totalChapters: number;
    completedChapters: number;
    currentChapter: number;
    percentComplete: number;
  };
  audio: {
    totalDurationSeconds: number;
    fileSizeMB: number | null;
  };
  cost: {
    charactersGenerated: number;
    apiCalls: number;
    totalCostDollars: number;
  };
}

// ============================================================================
// Database Row Types
// ============================================================================

export interface AudiobookProjectRow {
  id: string;
  project_id: string;
  narrator_voice_id: string | null;
  audio_quality: string;
  format: string;
  status: string;
  total_duration_seconds: number;
  file_size_mb: string | null;
  chapter_count: number;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface AudiobookVoiceRow {
  id: string;
  audiobook_project_id: string;
  character_name: string;
  voice_provider: string;
  voice_id: string;
  voice_settings: Record<string, unknown>;
  sample_audio_url: string | null;
  total_dialogue_seconds: number;
  created_at: Date;
  updated_at: Date;
}

export interface AudiobookSegmentRow {
  id: string;
  chapter_id: string;
  sequence_number: number;
  segment_type: string;
  character_name: string | null;
  text_content: string;
  emotion_detected: string | null;
  emotion_intensity: string | null;
  audio_url: string | null;
  duration_seconds: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface AudiobookUsageRow {
  id: string;
  audiobook_project_id: string;
  provider: string;
  characters_generated: number;
  api_calls: number;
  cost_dollars: string;
  created_at: Date;
}
