# Audiobook Technical Specification

Complete technical reference for integrating the Audiobook plugin into your applications.

---

## API Reference

### Base URL

```
https://api.adverant.ai/proxy/nexus-audiobook/audiobook/api
```

All endpoints require authentication via Bearer token in the Authorization header.

---

### Endpoints

#### Create Project

```http
POST /projects
```

Creates a new audiobook project from a ProseCreator manuscript.

**Request Body:**
```json
{
  "prose_project_id": "uuid",
  "title": "string",
  "author": "string",
  "genre": "fiction | nonfiction | biography | fantasy | romance | thriller | scifi | mystery",
  "narrator_style": "warm_professional | authoritative | casual | dramatic | neutral",
  "cover_image_url": "string (optional)",
  "metadata": {
    "publisher": "string (optional)",
    "isbn": "string (optional)",
    "copyright_year": "number (optional)"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "project_id": "uuid",
    "title": "string",
    "author": "string",
    "status": "created",
    "total_chapters": 24,
    "total_words": 85000,
    "estimated_duration_hours": 9.5,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Rate Limit:** 10 requests/minute

---

#### Get Project Details

```http
GET /projects/:id
```

Retrieves full project information including chapters, voice assignments, and generation status.

**Response:**
```json
{
  "success": true,
  "data": {
    "project_id": "uuid",
    "title": "string",
    "author": "string",
    "genre": "string",
    "status": "created | voice_assigned | generating | completed | failed",
    "chapters": [
      {
        "chapter_id": "uuid",
        "chapter_number": 1,
        "title": "Chapter One",
        "word_count": 3500,
        "estimated_duration_minutes": 23,
        "status": "pending | generating | completed"
      }
    ],
    "voice_assignments": [
      {
        "character_name": "Narrator",
        "voice_id": "voice_abc123",
        "voice_name": "Sarah",
        "provider": "elevenlabs",
        "role": "narrator"
      }
    ],
    "progress": {
      "chapters_completed": 12,
      "chapters_total": 24,
      "percent_complete": 50,
      "estimated_remaining_minutes": 120
    },
    "exports": [
      {
        "export_id": "uuid",
        "format": "m4b",
        "quality": "high",
        "download_url": "https://storage.adverant.ai/...",
        "file_size_bytes": 524288000,
        "expires_at": "2024-01-22T10:30:00Z"
      }
    ]
  }
}
```

---

#### Auto-Assign Voices

```http
POST /projects/:id/assign-voices
```

Automatically assigns voices to characters based on their attributes and dialogue patterns.

**Request Body:**
```json
{
  "strategy": "character_matched | genre_based | single_narrator | custom",
  "primary_provider": "elevenlabs | playht | xtts",
  "narrator_provider": "elevenlabs | playht | xtts",
  "preferences": {
    "narrator_gender": "male | female | neutral",
    "narrator_accent": "american | british | australian | irish",
    "character_diversity": true
  },
  "overrides": [
    {
      "character_name": "Lord Blackwood",
      "voice_id": "voice_specific_123"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "character_name": "Narrator",
        "voice_id": "voice_abc123",
        "voice_name": "Sarah",
        "provider": "elevenlabs",
        "confidence_score": 0.95,
        "reasoning": "Selected for warm, professional tone matching genre"
      },
      {
        "character_name": "Lord Blackwood",
        "voice_id": "voice_def456",
        "voice_name": "James",
        "provider": "elevenlabs",
        "confidence_score": 0.88,
        "reasoning": "Deep male voice for authoritative antagonist"
      }
    ],
    "estimated_cost_cents": 10500,
    "preview_available": true
  }
}
```

---

#### Start Generation

```http
POST /projects/:id/generate
```

Initiates audiobook generation. This is an async operation - use WebSocket or polling for progress.

**Request Body:**
```json
{
  "format": "m4b | mp3 | flac | wav",
  "quality": "standard | high | ultra",
  "options": {
    "include_chapter_markers": true,
    "normalize_audio": true,
    "target_lufs": -23,
    "sample_rate": 44100,
    "bit_depth": 16
  },
  "chapters": [1, 2, 3]  // Optional: specific chapters, or omit for all
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "generation_id": "uuid",
    "status": "queued",
    "position_in_queue": 3,
    "estimated_start_time": "2024-01-15T10:35:00Z",
    "estimated_completion_time": "2024-01-15T14:30:00Z",
    "websocket_url": "wss://api.adverant.ai/proxy/nexus-audiobook/ws/generation/uuid"
  }
}
```

---

#### Get Generation Status

```http
GET /projects/:id/status
```

Returns current generation progress.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "generating",
    "current_chapter": 8,
    "total_chapters": 24,
    "percent_complete": 33,
    "chapters": [
      {
        "chapter_number": 1,
        "status": "completed",
        "duration_seconds": 1380
      },
      {
        "chapter_number": 8,
        "status": "generating",
        "progress_percent": 45
      }
    ],
    "estimated_remaining_minutes": 180,
    "errors": []
  }
}
```

---

#### Download Audiobook

```http
GET /projects/:id/download
```

Returns signed download URLs for completed exports.

**Query Parameters:**
- `format`: `m4b | mp3 | flac | wav` (default: m4b)
- `quality`: `standard | high | ultra` (default: high)

**Response:**
```json
{
  "success": true,
  "data": {
    "download_url": "https://storage.adverant.ai/audiobooks/...",
    "expires_at": "2024-01-22T10:30:00Z",
    "file_size_bytes": 524288000,
    "checksum_sha256": "abc123...",
    "format": "m4b",
    "metadata": {
      "duration_seconds": 34200,
      "chapter_count": 24,
      "sample_rate": 44100,
      "bitrate": 128000
    }
  }
}
```

---

#### Clone Voice

```http
POST /voices/clone
```

Creates a custom voice clone from audio samples.

**Request Body (multipart/form-data):**
```
audio_file: (binary) - WAV or MP3, minimum 30 seconds
name: "string" - Display name for the voice
description: "string (optional)"
consent_confirmed: true - Required legal confirmation
```

**Response:**
```json
{
  "success": true,
  "data": {
    "voice_id": "cloned_voice_abc123",
    "name": "Author Voice",
    "status": "processing",
    "estimated_ready_minutes": 5,
    "sample_preview_url": "https://..."
  }
}
```

**Rate Limit:** Based on tier (0-unlimited clones)

---

#### List Voices

```http
GET /voices
```

Returns available voices filtered by criteria.

**Query Parameters:**
- `provider`: `elevenlabs | playht | xtts | cloned`
- `gender`: `male | female | neutral`
- `accent`: `american | british | australian | irish`
- `style`: `warm | authoritative | casual | dramatic`
- `limit`: `number` (default: 50)
- `offset`: `number` (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "voices": [
      {
        "voice_id": "voice_abc123",
        "name": "Sarah",
        "provider": "elevenlabs",
        "gender": "female",
        "accent": "american",
        "style": "warm_professional",
        "preview_url": "https://...",
        "cost_per_1k_chars_cents": 30,
        "is_cloned": false
      }
    ],
    "pagination": {
      "total": 1200,
      "limit": 50,
      "offset": 0
    }
  }
}
```

---

## Authentication

### Bearer Token

All API requests require authentication via the Nexus API Gateway.

```bash
curl -X GET "https://api.adverant.ai/proxy/nexus-audiobook/audiobook/api/projects" \
  -H "Authorization: Bearer YOUR_NEXUS_API_TOKEN"
```

### Token Scopes

| Scope | Description |
|-------|-------------|
| `audiobook:read` | Read project details, list voices |
| `audiobook:write` | Create projects, assign voices |
| `audiobook:generate` | Start audiobook generation |
| `audiobook:voice_clone` | Clone custom voices |

---

## Rate Limits

Rate limits vary by pricing tier:

| Tier | Requests/Minute | Concurrent Jobs | Hours/Month |
|------|-----------------|-----------------|-------------|
| Starter | 30 | 1 | 10 |
| Author | 60 | 2 | 50 |
| Publisher | 120 | 5 | 200 |
| Enterprise | 300 | Custom | Unlimited |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705312200
```

### Handling Rate Limits

When rate limited, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 45 seconds.",
    "retry_after": 45
  }
}
```

---

## Data Models

### Project

```typescript
interface AudiobookProject {
  project_id: string;          // UUID
  prose_project_id: string;    // Source ProseCreator project
  title: string;
  author: string;
  genre: Genre;
  narrator_style: NarratorStyle;
  status: ProjectStatus;
  total_chapters: number;
  total_words: number;
  estimated_duration_hours: number;
  cover_image_url?: string;
  metadata: {
    publisher?: string;
    isbn?: string;
    copyright_year?: number;
  };
  created_at: string;          // ISO 8601
  updated_at: string;          // ISO 8601
}

type Genre = 'fiction' | 'nonfiction' | 'biography' | 'fantasy' |
             'romance' | 'thriller' | 'scifi' | 'mystery';

type NarratorStyle = 'warm_professional' | 'authoritative' |
                     'casual' | 'dramatic' | 'neutral';

type ProjectStatus = 'created' | 'voice_assigned' | 'generating' |
                     'completed' | 'failed';
```

### Chapter

```typescript
interface Chapter {
  chapter_id: string;          // UUID
  project_id: string;          // Foreign key
  chapter_number: number;
  title: string;
  content: string;             // Full text
  word_count: number;
  estimated_duration_minutes: number;
  status: ChapterStatus;
  audio_url?: string;          // When completed
  duration_seconds?: number;   // When completed
}

type ChapterStatus = 'pending' | 'generating' | 'completed' | 'failed';
```

### Voice

```typescript
interface Voice {
  voice_id: string;
  name: string;
  provider: VoiceProvider;
  gender: 'male' | 'female' | 'neutral';
  accent: string;
  style: string;
  preview_url: string;
  cost_per_1k_chars_cents: number;
  is_cloned: boolean;
  owner_id?: string;           // For cloned voices
}

type VoiceProvider = 'elevenlabs' | 'playht' | 'xtts' | 'cloned';
```

### Voice Assignment

```typescript
interface VoiceAssignment {
  assignment_id: string;
  project_id: string;
  voice_id: string;
  character_name: string;
  role: 'narrator' | 'protagonist' | 'antagonist' | 'supporting';
  confidence_score: number;    // 0-1
  reasoning: string;
}
```

### Export

```typescript
interface AudiobookExport {
  export_id: string;
  project_id: string;
  format: ExportFormat;
  quality: Quality;
  status: ExportStatus;
  download_url?: string;
  file_size_bytes?: number;
  checksum_sha256?: string;
  duration_seconds?: number;
  chapter_count: number;
  created_at: string;
  expires_at?: string;
}

type ExportFormat = 'm4b' | 'mp3' | 'flac' | 'wav';
type Quality = 'standard' | 'high' | 'ultra';
type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';
```

---

## SDK Integration

### JavaScript/TypeScript SDK

```typescript
import { NexusClient } from '@nexus/sdk';

const nexus = new NexusClient({
  apiKey: process.env.NEXUS_API_KEY,
});

// Create audiobook project
const project = await nexus.audiobook.createProject({
  prose_project_id: 'source-uuid',
  title: 'The Dragon Heir',
  author: 'Jane Author',
  genre: 'fantasy',
  narrator_style: 'dramatic',
});

// Auto-assign voices
const assignments = await nexus.audiobook.assignVoices(project.project_id, {
  strategy: 'character_matched',
  primary_provider: 'elevenlabs',
});

// Start generation with progress callback
const generation = await nexus.audiobook.generate(project.project_id, {
  format: 'm4b',
  quality: 'high',
  onProgress: (progress) => {
    console.log(`Chapter ${progress.current}/${progress.total}: ${progress.percent}%`);
  },
});

// Download when complete
const download = await nexus.audiobook.download(project.project_id, {
  format: 'm4b',
});
console.log(`Download URL: ${download.download_url}`);
```

### Python SDK

```python
from nexus import NexusClient

client = NexusClient(api_key=os.environ["NEXUS_API_KEY"])

# Create project
project = client.audiobook.create_project(
    prose_project_id="source-uuid",
    title="The Dragon Heir",
    author="Jane Author",
    genre="fantasy",
    narrator_style="dramatic"
)

# Assign voices
assignments = client.audiobook.assign_voices(
    project.project_id,
    strategy="character_matched",
    primary_provider="elevenlabs"
)

# Generate with progress
def on_progress(progress):
    print(f"Chapter {progress['current']}/{progress['total']}: {progress['percent']}%")

generation = client.audiobook.generate(
    project.project_id,
    format="m4b",
    quality="high",
    on_progress=on_progress
)

# Download
download = client.audiobook.download(project.project_id, format="m4b")
print(f"Download URL: {download.download_url}")
```

---

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('wss://api.adverant.ai/proxy/nexus-audiobook/ws');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'YOUR_API_TOKEN'
  }));
};
```

### Subscribe to Generation Progress

```javascript
// Subscribe to project updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'generation',
  project_id: 'your-project-id'
}));

// Handle messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'progress':
      console.log(`Chapter ${message.chapter}: ${message.percent}%`);
      break;
    case 'chapter_complete':
      console.log(`Chapter ${message.chapter} finished`);
      break;
    case 'generation_complete':
      console.log(`Audiobook ready: ${message.download_url}`);
      break;
    case 'error':
      console.error(`Error: ${message.message}`);
      break;
  }
};
```

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `auth` | Client → Server | Authenticate connection |
| `subscribe` | Client → Server | Subscribe to updates |
| `unsubscribe` | Client → Server | Unsubscribe |
| `progress` | Server → Client | Generation progress |
| `chapter_complete` | Server → Client | Chapter finished |
| `generation_complete` | Server → Client | Full audiobook ready |
| `error` | Server → Client | Error notification |

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {},
    "request_id": "req_abc123"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request body |
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid token |
| `INSUFFICIENT_PERMISSIONS` | 403 | Token lacks required scope |
| `PROJECT_NOT_FOUND` | 404 | Project does not exist |
| `VOICE_NOT_FOUND` | 404 | Voice ID invalid |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `QUOTA_EXCEEDED` | 402 | Monthly hours/clones exceeded |
| `GENERATION_FAILED` | 500 | TTS generation error |
| `PROVIDER_UNAVAILABLE` | 503 | External TTS provider down |

### Retry Strategy

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        const delay = error.retry_after * 1000;
        await sleep(delay);
        continue;
      }
      if (error.code === 'PROVIDER_UNAVAILABLE' && attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Deployment Requirements

### Container Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1000m | 2000m |
| Memory | 2Gi | 4Gi |
| Storage | 20Gi | 50Gi |
| Timeout | 1 hour | 4 hours |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXUS_API_KEY` | Yes | Nexus platform API key |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs TTS API key |
| `PLAYHT_API_KEY` | No | Play.ht fallback API key |
| `AUDIO_STORAGE_PATH` | Yes | Path for audio file storage |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | No | Redis for job queue |

### Health Checks

```yaml
livenessProbe:
  httpGet:
    path: /audiobook/api/health/live
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /audiobook/api/health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## Security Considerations

### Voice Cloning Consent

All voice cloning requires explicit consent confirmation:

```json
{
  "consent_confirmed": true
}
```

Without this flag, voice clone requests are rejected with `CONSENT_REQUIRED` error.

### Audio File Security

- All audio files are encrypted at rest (AES-256)
- Download URLs are signed and expire after 7 days
- Files are automatically deleted 30 days after last access

### API Security

- All requests must use HTTPS
- Tokens are validated against the Nexus API Gateway
- Request signing available for webhook payloads

---

## Quotas and Limits

### Per-Tier Limits

| Limit | Starter | Author | Publisher | Enterprise |
|-------|---------|--------|-----------|------------|
| Hours/Month | 10 | 50 | 200 | Unlimited |
| Characters/Hour | 5 | 20 | 50 | Unlimited |
| Voice Clones | 0 | 2 | 10 | Unlimited |
| Concurrent Jobs | 1 | 2 | 5 | Custom |
| Max Project Size | 100K words | 500K words | 1M words | Unlimited |

### Overage Pricing

| Resource | Rate |
|----------|------|
| Additional Hour | $5.00 |
| Additional Voice Clone | $25.00 |

### Checking Quota

```http
GET /account/quota
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tier": "author",
    "period_start": "2024-01-01T00:00:00Z",
    "period_end": "2024-02-01T00:00:00Z",
    "hours": {
      "used": 23.5,
      "limit": 50,
      "remaining": 26.5
    },
    "voice_clones": {
      "used": 1,
      "limit": 2,
      "remaining": 1
    },
    "concurrent_jobs": {
      "active": 1,
      "limit": 2
    }
  }
}
```

---

## Audio Specifications

### Output Quality Settings

| Quality | Sample Rate | Bit Depth | Bitrate (MP3) |
|---------|-------------|-----------|---------------|
| Standard | 22.05 kHz | 16-bit | 64 kbps |
| High | 44.1 kHz | 16-bit | 128 kbps |
| Ultra | 48 kHz | 24-bit | 320 kbps |

### Loudness Normalization

All output is normalized to industry standards:

- Target: -23 LUFS (audiobook industry standard)
- True Peak: -1 dBTP maximum
- Integrated loudness variation: ±1 LU

### Chapter Markers (M4B)

M4B exports include embedded chapter markers compatible with:
- Apple Books
- Audible
- Most audiobook players

---

## Support

- **Documentation**: [docs.adverant.ai/plugins/audiobook](https://docs.adverant.ai/plugins/audiobook)
- **API Status**: [status.adverant.ai](https://status.adverant.ai)
- **Support Email**: support@adverant.ai
- **Discord**: [discord.gg/adverant](https://discord.gg/adverant)
