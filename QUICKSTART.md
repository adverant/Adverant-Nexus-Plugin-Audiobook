# Audiobook Quick Start Guide

**Create professional audiobooks with AI narration** - Transform your manuscripts into broadcast-quality audiobooks in hours instead of weeks.

---

## The Audiobook Advantage

| Feature | Traditional Production | Audiobook AI |
|---------|------------------------|--------------|
| Production Time | 6-8 weeks | 24-48 hours |
| Cost per Hour | $200-400 PFH | $5-25 PFH |
| Voice Options | Limited to hired narrator | Multiple AI voices |
| Revisions | Additional cost | Included |

**Potential savings vary based on project scope and requirements.**

---

## Prerequisites

| Requirement | Minimum | Purpose |
|-------------|---------|---------|
| Nexus Platform | v1.0.0+ | Plugin runtime |
| Node.js | v20+ | SDK (TypeScript) |
| Python | v3.9+ | SDK (Python) |
| API Key | - | Authentication |
| Source Manuscript | - | EPUB, DOCX, or TXT |

---

## Installation (Choose Your Method)

### Method 1: Nexus Marketplace (Recommended)

1. Navigate to **Marketplace** in your Nexus Dashboard
2. Search for "Audiobook"
3. Click **Install** and select your tier
4. The plugin activates automatically within 60 seconds

### Method 2: Nexus CLI

```bash
nexus plugin install nexus-audiobook
nexus config set AUDIOBOOK_API_KEY your-api-key-here
```

### Method 3: Direct API

```bash
curl -X POST "https://api.adverant.ai/v1/plugins/install" \
  -H "Authorization: Bearer YOUR_NEXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pluginId": "nexus-audiobook",
    "tier": "author",
    "autoActivate": true
  }'
```

---

## Your First Audiobook: Step-by-Step

### Step 1: Set Your API Key

```bash
export NEXUS_API_KEY="your-api-key-here"
```

### Step 2: Create an Audiobook Project

```bash
curl -X POST "https://api.adverant.ai/proxy/nexus-audiobook/audiobook/api/projects" \
  -H "Authorization: Bearer $NEXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Dragon's Quest",
    "author": "Jane Author",
    "genre": "fantasy",
    "sourceUrl": "https://storage.example.com/manuscripts/dragons-quest.epub",
    "settings": {
      "quality": "high",
      "includeChapterMarkers": true,
      "outputFormat": "m4b"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projectId": "proj_Abc123",
    "title": "The Dragon's Quest",
    "status": "processing",
    "chapters": 24,
    "estimatedDuration": "10h 45m",
    "estimatedCompletion": "2026-01-02T10:00:00Z",
    "voiceRecommendations": [
      {
        "voiceId": "voice_ElevenLabs_Marcus",
        "name": "Marcus",
        "gender": "male",
        "style": "dramatic_narrative",
        "sampleUrl": "https://samples.adverant.ai/marcus-sample.mp3",
        "matchScore": 0.94
      }
    ]
  }
}
```

### Step 3: Assign Voices

```bash
curl -X POST "https://api.adverant.ai/proxy/nexus-audiobook/audiobook/api/projects/proj_Abc123/assign-voices" \
  -H "Authorization: Bearer $NEXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "narrator": "voice_ElevenLabs_Marcus",
    "characterVoices": {
      "Sir Aldric": "voice_ElevenLabs_James",
      "Queen Elara": "voice_ElevenLabs_Sophia",
      "Grendox the Dragon": "voice_Custom_Dragon_Deep"
    }
  }'
```

### Step 4: Generate the Audiobook

```bash
curl -X POST "https://api.adverant.ai/proxy/nexus-audiobook/audiobook/api/projects/proj_Abc123/generate" \
  -H "Authorization: Bearer $NEXUS_API_KEY"
```

### Step 5: Download When Complete

```bash
curl -X GET "https://api.adverant.ai/proxy/nexus-audiobook/audiobook/api/projects/proj_Abc123/download" \
  -H "Authorization: Bearer $NEXUS_API_KEY"
```

---

## Core API Endpoints

**Base URL:** `https://api.adverant.ai/proxy/nexus-audiobook/audiobook/api`

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| `POST` | `/projects` | Create audiobook project | 10/min |
| `GET` | `/projects/:id` | Get project details | 60/min |
| `POST` | `/projects/:id/assign-voices` | Assign character voices | 30/min |
| `POST` | `/projects/:id/generate` | Start generation | 10/min |
| `GET` | `/projects/:id/status` | Check generation status | 60/min |
| `GET` | `/projects/:id/download` | Download audiobook | 30/min |
| `POST` | `/voices/clone` | Clone a voice | 5/min |
| `GET` | `/voices` | List available voices | 60/min |

---

## SDK Examples

### TypeScript/JavaScript

```typescript
import { NexusClient } from '@adverant/nexus-sdk';

const nexus = new NexusClient({
  apiKey: process.env.NEXUS_API_KEY!
});

const audiobook = nexus.plugin('nexus-audiobook');

// Create a new audiobook project
const project = await audiobook.projects.create({
  title: "The Dragon's Quest",
  author: "Jane Author",
  genre: "fantasy",
  sourceUrl: "https://storage.example.com/manuscript.epub"
});

console.log(`Project created: ${project.projectId}`);
console.log(`Estimated duration: ${project.estimatedDuration}`);

// Get voice recommendations
const voices = await audiobook.voices.recommend({
  genre: "fantasy",
  gender: "male",
  style: "dramatic"
});

// Assign the recommended narrator
await audiobook.projects.assignVoices({
  projectId: project.projectId,
  narrator: voices[0].voiceId
});

// Start generation
await audiobook.projects.generate({ projectId: project.projectId });

// Poll for completion
let status = await audiobook.projects.status({ projectId: project.projectId });
while (status.status !== 'completed') {
  await new Promise(r => setTimeout(r, 60000)); // Wait 1 minute
  status = await audiobook.projects.status({ projectId: project.projectId });
  console.log(`Progress: ${status.progress}%`);
}

// Download the audiobook
const download = await audiobook.projects.download({ projectId: project.projectId });
console.log(`Download URL: ${download.url}`);
```

### Python

```python
import os
import time
from nexus_sdk import NexusClient

client = NexusClient(api_key=os.environ["NEXUS_API_KEY"])
audiobook = client.plugin("nexus-audiobook")

# Create project
project = audiobook.projects.create(
    title="The Dragon's Quest",
    author="Jane Author",
    genre="fantasy",
    source_url="https://storage.example.com/manuscript.epub"
)

print(f"Project: {project.project_id}")
print(f"Chapters: {project.chapters}")

# Auto-assign voices based on character analysis
audiobook.projects.assign_voices(
    project_id=project.project_id,
    auto_assign=True,
    narrator_preference="male_dramatic"
)

# Generate audiobook
audiobook.projects.generate(project_id=project.project_id)

# Wait for completion
while True:
    status = audiobook.projects.status(project_id=project.project_id)
    print(f"Progress: {status.progress}%")
    if status.status == "completed":
        break
    time.sleep(60)

# Download
download = audiobook.projects.download(project_id=project.project_id)
print(f"Audiobook ready: {download.url}")
```

---

## Pricing

| Feature | Starter | Author | Publisher | Enterprise |
|---------|---------|--------|-----------|------------|
| **Monthly Price** | $29 | $79 | $249 | $999 |
| **Hours/Month** | 10 | 50 | 200 | Unlimited |
| **Characters/Hour** | 5 | 20 | 50 | Unlimited |
| **Voice Clones** | 0 | 2 | 10 | Unlimited |
| **Quality** | Standard | High | High | Ultra |
| **Export Formats** | MP3 | MP3, M4B | All | All |
| **Chapter Markers** | - | Yes | Yes | Yes |
| **Priority Processing** | - | - | Yes | Yes |
| **Hour Overage** | $5/hr | $5/hr | $5/hr | Custom |

**7-day free trial. Cancel anytime.**

[Start Free Trial](https://marketplace.adverant.ai/plugins/nexus-audiobook)

---

## Rate Limits

| Tier | Projects/Day | Concurrent Jobs | Timeout |
|------|--------------|-----------------|---------|
| Starter | 5 | 1 | 1 hour |
| Author | 20 | 2 | 2 hours |
| Publisher | 100 | 5 | 4 hours |
| Enterprise | Unlimited | Custom | Custom |

---

## Next Steps

1. **[Use Cases Guide](./USE-CASES.md)** - Publishing workflows and examples
2. **[Architecture Overview](./ARCHITECTURE.md)** - Voice technology and processing
3. **[API Reference](./docs/api-reference/endpoints.md)** - Complete endpoint documentation

---

## Support

| Channel | Response Time | Availability |
|---------|---------------|--------------|
| **Documentation** | Instant | [docs.adverant.ai/plugins/audiobook](https://docs.adverant.ai/plugins/audiobook) |
| **Discord Community** | < 2 hours | [discord.gg/adverant](https://discord.gg/adverant) |
| **Email Support** | < 24 hours | support@adverant.ai |
| **Priority Support** | < 1 hour | Enterprise only |

---

*Audiobook is built and maintained by [Adverant](https://adverant.ai) - Verified Nexus Plugin Developer*
