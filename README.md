
<h1 align="center">Audiobook</h1>

<p align="center">
  <strong>Transform Your Books into Professional Audiobooks</strong>
</p>

<p align="center">
  <a href="https://github.com/adverant/Adverant-Nexus-Plugin-Audiobook/actions"><img src="https://github.com/adverant/Adverant-Nexus-Plugin-Audiobook/workflows/CI/badge.svg" alt="CI Status"></a>
  <a href="https://github.com/adverant/Adverant-Nexus-Plugin-Audiobook/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License"></a>
  <a href="https://marketplace.adverant.ai/plugins/audiobook"><img src="https://img.shields.io/badge/Nexus-Marketplace-purple.svg" alt="Nexus Marketplace"></a>
  <a href="https://discord.gg/adverant"><img src="https://img.shields.io/discord/123456789?color=7289da&label=Discord" alt="Discord"></a>
</p>

<p align="center">
  <a href="#features">Features</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#use-cases">Use Cases</a> |
  <a href="#pricing">Pricing</a> |
  <a href="#documentation">Documentation</a>
</p>

---

## Turn Every Book into an Audio Experience

**Audiobook** is a Nexus Marketplace plugin that transforms your written content into professional-quality audiobooks using AI narration, voice cloning, and multi-voice technology. Produce audiobooks at a fraction of traditional costs while maintaining broadcast quality.

### Why Publishers Choose Audiobook

- **90% Cost Reduction**: Create audiobooks for $100-500 instead of $3,000-15,000
- **Multi-Voice Support**: Unique voices for each character matched to their personality
- **Voice Cloning**: Clone author voices or create custom narrator personas
- **Professional Quality**: -23 LUFS normalization, CD-quality audio (44.1kHz)
- **Industry Formats**: Export M4B (with chapters), MP3, and more

---

## Features

### Multi-Provider TTS Engine

Three TTS providers for optimal cost and quality:

| Provider | Voices | Best For | Cost |
|----------|--------|----------|------|
| **ElevenLabs** | 1,200+ | Main characters, premium quality | $0.30/1K chars |
| **XTTS-v2** | Unlimited | Narration, voice cloning | Self-hosted (free) |
| **PlayHT** | 800+ | Fallback, budget options | $0.20/1K chars |

### AI-Powered Voice Matching

Automatically assigns the perfect voice to each character based on:

- **Gender**: Male, female, neutral options
- **Age Range**: Child, teen, adult, elderly voices
- **Accent**: British, American, Irish, Australian, and more
- **Personality**: Confident, warm, mysterious, authoritative
- **Emotional Range**: Match voice expressiveness to character depth

### Voice Cloning Technology

Clone any voice with just 30 seconds of audio:

- **Author Narration**: Use the author's own voice for authenticity
- **Custom Characters**: Create unique voices for your cast
- **Consistent Branding**: Maintain narrator voice across a series
- **Celebrity-Style**: Generate voices inspired by popular narrators

### Professional Audio Assembly

Broadcast-ready output with:

- **Chapter Markers**: Automatic chapter navigation (M4B format)
- **Audio Normalization**: Industry-standard -23 LUFS loudness
- **Seamless Stitching**: Natural transitions between segments
- **ID3 Metadata**: Title, author, cover art, chapter info
- **Multiple Formats**: M4B (audiobook), MP3 (universal)

### Real-Time Progress Streaming

Monitor generation in real-time:

- WebSocket-based progress updates
- Estimated time remaining
- Per-chapter status tracking
- Error recovery and retry handling

---

## Quick Start

### Installation

```bash
# Via Nexus Marketplace (Recommended)
nexus plugin install nexus-audiobook

# Or via API
curl -X POST "https://api.adverant.ai/plugins/nexus-audiobook/install" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Create Audiobook Project

```bash
curl -X POST "https://api.adverant.ai/proxy/nexus-audiobook/audiobook/api/projects" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prose_project_id": "your-prosecreator-project-id",
    "title": "The Dragon Heir",
    "author": "Jane Author",
    "narrator_style": "warm_professional"
  }'
```

### Auto-Assign Character Voices

```bash
curl -X POST "https://api.adverant.ai/proxy/nexus-audiobook/audiobook/api/projects/:id/assign-voices" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "character_matched",
    "primary_provider": "elevenlabs",
    "narrator_provider": "xtts"
  }'
```

### Generate Audiobook

```javascript
// Connect via WebSocket for real-time progress
const ws = new WebSocket('wss://api.adverant.ai/proxy/nexus-audiobook/ws');

ws.send(JSON.stringify({
  type: 'generate_audiobook',
  project_id: 'your-project-id',
  options: {
    format: 'm4b',
    quality: 'high',
    include_chapters: true
  }
}));

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Chapter ${data.chapter}: ${data.progress}%`);
};
```

---

## Use Cases

### For Indie Authors

#### 1. Self-Published Audiobook Production
Create professional audiobooks for your self-published novels without breaking the bank. Retain 100% of your royalties.

#### 2. Series Consistency
Maintain the same narrator voice across your entire book series using voice cloning technology.

#### 3. Multi-Language Editions
Generate audiobooks in multiple languages to reach global audiences.

### For Publishing Houses

#### 4. Backlist Monetization
Convert your entire backlist to audiobooks at scale. Turn dormant titles into new revenue streams.

#### 5. Rapid Production
Produce audiobooks in days instead of months. Meet market demand faster.

#### 6. Cost-Effective Testing
Test audiobook viability for new titles with minimal investment.

### For Content Creators

#### 7. Podcast Fiction
Transform written stories into podcast-ready audio dramas with multiple voice actors.

#### 8. Educational Content
Convert textbooks and educational materials into accessible audio formats.

### For Accessibility

#### 9. Visually Impaired Support
Make your content accessible to readers who prefer or require audio formats.

---

## Architecture

```
+------------------------------------------------------------------+
|                      Audiobook Plugin                             |
+------------------------------------------------------------------+
|  +----------------+  +--------------+  +----------------------+  |
|  | Voice         |  |  TTS         |  | Audio               |  |
|  | Matching      |  |  Orchestrator|  | Assembler           |  |
|  | Engine        |  |              |  |                     |  |
|  +-------+-------+  +------+-------+  +----------+-----------+  |
|          |                 |                     |               |
|          v                 v                     v               |
|  +-----------------------------------------------------------+  |
|  |                    TTS Provider Layer                      |  |
|  |  +------------+ +------------+ +------------+              |  |
|  |  | ElevenLabs | |  XTTS-v2   | |  PlayHT    |              |  |
|  |  | (Premium)  | | (Cloning)  | | (Fallback) |              |  |
|  |  +------------+ +------------+ +------------+              |  |
|  +-----------------------------------------------------------+  |
|          |                                                       |
|          v                                                       |
|  +-----------------------------------------------------------+  |
|  |                    Audio Processing                         |  |
|  |   Normalization | Chapter Markers | ID3 Tags | Export       |  |
|  +-----------------------------------------------------------+  |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                    Nexus Core Services                            |
|  +----------+  +----------+  +----------+  +----------+          |
|  |MageAgent |  |FileProc  |  | Storage  |  | Billing  |          |
|  | (AI)     |  |(Audio)   |  | (Files)  |  |(Usage)   |          |
|  +----------+  +----------+  +----------+  +----------+          |
+------------------------------------------------------------------+
```

---

## Cost Estimation

### For a 350,000-Word Novel (~9-Hour Audiobook)

| Approach | Cost | Quality |
|----------|------|---------|
| **Traditional Narrator** | $3,000 - $15,000 | Professional |
| **Full ElevenLabs** | ~$525 | Premium AI |
| **Full XTTS (Self-Hosted)** | $0 | Good AI |
| **Hybrid (Recommended)** | ~$105 | Premium AI |

**Hybrid Approach Breakdown:**
- ElevenLabs for main characters (20%): ~$105
- XTTS-v2 for narrator & supporting (80%): $0
- **Total: ~$105 per audiobook**

---

## Pricing

| Feature | Starter | Author | Publisher | Enterprise |
|---------|---------|--------|-----------|------------|
| **Price** | $29/mo | $79/mo | $249/mo | $999/mo |
| **Hours/month** | 10 | 50 | 200 | Unlimited |
| **Characters/hour** | 5 | 20 | 50 | Unlimited |
| **Voice Cloning** | - | 2 voices | 10 voices | Unlimited |
| **ElevenLabs Access** | - | Yes | Yes | Yes |
| **Priority Processing** | - | - | Yes | Yes |
| **API Access** | - | Yes | Yes | Yes |
| **White-Label Export** | - | - | - | Yes |
| **Dedicated Support** | - | - | - | Yes |

[View on Nexus Marketplace](https://marketplace.adverant.ai/plugins/audiobook)

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/projects` | Create audiobook project |
| `GET` | `/projects/:id` | Get project details |
| `POST` | `/projects/:id/assign-voices` | Auto-assign character voices |
| `POST` | `/projects/:id/generate` | Start audiobook generation |
| `GET` | `/projects/:id/status` | Get generation status |
| `GET` | `/projects/:id/download` | Download completed audiobook |
| `POST` | `/voices/clone` | Clone a voice from audio sample |
| `GET` | `/voices` | List available voices |
| `GET` | `/voices/match` | Get voice recommendations |

Full API documentation: [docs/api-reference/endpoints.md](docs/api-reference/endpoints.md)

---

## Audio Specifications

| Specification | Value | Standard |
|---------------|-------|----------|
| **Sample Rate** | 44.1 kHz | CD Quality |
| **Bit Depth** | 16-bit | Standard |
| **Bitrate (MP3)** | 128 kbps | Audible Standard |
| **Loudness** | -23 LUFS | Audiobook Industry |
| **Format (Primary)** | M4B | Apple/Audible |
| **Format (Universal)** | MP3 | All Platforms |

---

## Documentation

- [Installation Guide](docs/getting-started/installation.md)
- [Configuration](docs/getting-started/configuration.md)
- [Quick Start](docs/getting-started/quickstart.md)
- [API Reference](docs/api-reference/endpoints.md)
- [Voice Matching Guide](docs/guides/voice-matching.md)
- [Voice Cloning Tutorial](docs/guides/voice-cloning.md)

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/adverant/Adverant-Nexus-Plugin-Audiobook.git
cd Adverant-Nexus-Plugin-Audiobook

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

---

## Community & Support

- **Documentation**: [docs.adverant.ai/plugins/audiobook](https://docs.adverant.ai/plugins/audiobook)
- **Discord**: [discord.gg/adverant](https://discord.gg/adverant)
- **Email**: support@adverant.ai
- **GitHub Issues**: [Report a bug](https://github.com/adverant/Adverant-Nexus-Plugin-Audiobook/issues)

---

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Built with care by <a href="https://adverant.ai">Adverant</a></strong>
</p>

<p align="center">
  <a href="https://adverant.ai">Website</a> |
  <a href="https://docs.adverant.ai">Docs</a> |
  <a href="https://marketplace.adverant.ai">Marketplace</a> |
  <a href="https://twitter.com/adverant">Twitter</a>
</p>
