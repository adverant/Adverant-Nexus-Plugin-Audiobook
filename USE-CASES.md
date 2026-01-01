# Audiobook Use Cases

Real-world implementation scenarios for AI-powered audiobook production.

---

## Use Case 1: Indie Author Audiobook Production

### Problem

Indie authors can't afford $3,000-5,000 for traditional audiobook production. This limits their reach to audio-only listeners (30% of the book market).

### Solution

AI-powered narration that produces broadcast-quality audiobooks at 90% lower cost.

### Implementation

```typescript
import { NexusClient } from '@adverant/nexus-sdk';

class IndieAuthorWorkflow {
  private audiobook;

  constructor(nexusClient: NexusClient) {
    this.audiobook = nexusClient.plugin('nexus-audiobook');
  }

  async produceAudiobook(manuscript: Manuscript) {
    // Create project from ProseCreator or uploaded file
    const project = await this.audiobook.projects.create({
      title: manuscript.title,
      author: manuscript.author,
      genre: manuscript.genre,
      sourceUrl: manuscript.fileUrl,
      settings: {
        quality: 'high',
        outputFormat: 'm4b',
        includeChapterMarkers: true,
        retailReady: true // ACX/Findaway compatible
      }
    });

    // Get AI voice recommendations based on genre and style
    const voiceRecs = await this.audiobook.voices.recommend({
      projectId: project.projectId,
      analyzeContent: true,
      preferences: {
        narratorGender: manuscript.preferredNarratorGender,
        style: manuscript.narrativeStyle
      }
    });

    // Preview voices before committing
    const previews = await Promise.all(
      voiceRecs.slice(0, 3).map(voice =>
        this.audiobook.voices.preview({
          voiceId: voice.voiceId,
          sampleText: manuscript.openingParagraph
        })
      )
    );

    // Assign selected voice
    await this.audiobook.projects.assignVoices({
      projectId: project.projectId,
      narrator: voiceRecs[0].voiceId // Or user-selected voice
    });

    // Generate with progress tracking
    const generation = await this.audiobook.projects.generate({
      projectId: project.projectId,
      onProgress: (progress) => {
        console.log(`Chapter ${progress.currentChapter}/${progress.totalChapters}`);
      }
    });

    return {
      project,
      voicePreviews: previews,
      estimatedCost: project.estimatedCost,
      traditionalCost: project.estimatedDuration * 300, // $300 PFH traditional
      savings: project.estimatedDuration * 300 - project.estimatedCost
    };
  }
}
```

### Business Impact

- **Significant cost reduction** compared to traditional studio production
- **Faster turnaround** measured in days rather than weeks
- **Lower barrier to entry** for audiobook market

---

## Use Case 2: Multi-Character Fiction with Distinct Voices

### Problem

Fantasy and fiction books with many characters sound monotonous with single-narrator audiobooks. Traditional multi-voice production is prohibitively expensive.

### Solution

AI character voice assignment with distinct voices for each character.

### Implementation

```typescript
class MultiVoiceAudiobook {
  private audiobook;

  constructor(nexusClient: NexusClient) {
    this.audiobook = nexusClient.plugin('nexus-audiobook');
  }

  async createMultiVoiceAudiobook(projectId: string) {
    // Analyze manuscript for characters
    const characterAnalysis = await this.audiobook.characters.analyze({
      projectId,
      extractDialogue: true,
      identifyGender: true,
      estimateAge: true,
      detectPersonality: true
    });

    // Get voice matches for each character
    const voiceAssignments = await Promise.all(
      characterAnalysis.characters.map(async (character) => {
        const matches = await this.audiobook.voices.match({
          gender: character.gender,
          ageRange: character.estimatedAge,
          personality: character.personality,
          role: character.role // protagonist, antagonist, supporting
        });

        return {
          characterName: character.name,
          voiceId: matches[0].voiceId,
          voiceName: matches[0].name,
          matchScore: matches[0].score
        };
      })
    );

    // Assign all voices
    await this.audiobook.projects.assignVoices({
      projectId,
      narrator: voiceAssignments.find(v => v.role === 'narrator')?.voiceId,
      characterVoices: Object.fromEntries(
        voiceAssignments.map(v => [v.characterName, v.voiceId])
      )
    });

    return {
      characters: characterAnalysis.characters.length,
      voiceAssignments,
      estimatedVariety: 'high'
    };
  }
}
```

### Business Impact

- **Multiple character voices** available at fixed cost
- **Consistent character voices** throughout series
- **More engaging listening experience** compared to single-narrator productions

---

## Use Case 3: Series Audiobook Production

### Problem

Publishers with book series need consistent narrator voice across all titles. Scheduling and costs compound with each book.

### Solution

Voice consistency management and bulk production workflow.

### Implementation

```python
class SeriesAudiobookProduction:
    def __init__(self, nexus_client):
        self.audiobook = nexus_client.plugin("nexus-audiobook")

    async def create_series_project(self, series_info: dict):
        # Create series container
        series = await self.audiobook.series.create({
            "name": series_info["name"],
            "author": series_info["author"],
            "genre": series_info["genre"],
            "books": series_info["book_count"]
        })

        # Lock in consistent voice for series
        voice = await self.audiobook.voices.select_for_series({
            "series_id": series.series_id,
            "sample_from": series_info["first_book_sample"],
            "lock_voice": True
        })

        return {
            "series": series,
            "locked_voice": voice,
            "estimated_total_hours": series_info["total_word_count"] / 9000,
            "estimated_cost": self.calculate_series_cost(series_info)
        }

    async def produce_book_in_series(self, series_id: str, book_info: dict):
        # Create project linked to series
        project = await self.audiobook.projects.create({
            "series_id": series_id,
            "title": book_info["title"],
            "book_number": book_info["number"],
            "source_url": book_info["manuscript_url"],
            "use_series_voice": True,  # Automatically uses locked voice
            "inherit_character_voices": True  # Recurring characters use same voices
        })

        # Generate with series consistency checks
        await self.audiobook.projects.generate({
            "project_id": project.project_id,
            "consistency_check": True,
            "reference_previous": book_info["number"] > 1
        })

        return project

    async def batch_produce_series(self, series_id: str, books: list):
        # Queue all books for production
        queue = await self.audiobook.batch.create({
            "series_id": series_id,
            "books": books,
            "priority": "series_order",  # Produce in order
            "parallel_limit": 2  # 2 books at a time
        })

        return queue
```

### Business Impact

- **Voice consistency** across entire series
- **Volume pricing** available for series production
- **Streamlined workflow** for multi-book projects

---

## Use Case 4: Publisher Catalog Conversion

### Problem

Publishers have backlist titles without audiobook versions. Converting the entire catalog is cost-prohibitive with traditional methods.

### Solution

Bulk conversion workflow with automated processing.

### Implementation

```typescript
class CatalogConversionService {
  private audiobook;

  constructor(nexusClient: NexusClient) {
    this.audiobook = nexusClient.plugin('nexus-audiobook');
  }

  async convertCatalog(catalog: BookCatalog) {
    // Prioritize books by potential ROI
    const prioritized = await this.audiobook.analysis.prioritize({
      books: catalog.books,
      factors: ['sales_history', 'genre_audiobook_demand', 'word_count']
    });

    // Create batch conversion job
    const batch = await this.audiobook.batch.create({
      name: `Catalog Conversion ${new Date().toISOString()}`,
      books: prioritized.slice(0, 100), // First 100 highest priority
      settings: {
        quality: 'high',
        voiceMatching: 'auto',
        retailReady: true
      }
    });

    // Monitor batch progress
    const monitor = await this.audiobook.batch.monitor({
      batchId: batch.batchId,
      webhookUrl: 'https://mysite.com/audiobook-webhook',
      notifyOn: ['completed', 'failed', 'quality_review_needed']
    });

    return {
      batchId: batch.batchId,
      totalBooks: prioritized.length,
      estimatedCompletion: batch.estimatedCompletion,
      estimatedCost: batch.estimatedCost,
      projectedRevenue: this.estimateRevenue(prioritized)
    };
  }

  async handleQualityReview(projectId: string) {
    // Get flagged sections
    const review = await this.audiobook.projects.getQualityFlags({
      projectId
    });

    // Regenerate specific sections if needed
    for (const flag of review.flags) {
      await this.audiobook.projects.regenerateSection({
        projectId,
        chapterId: flag.chapterId,
        startTime: flag.startTime,
        endTime: flag.endTime,
        adjustments: flag.suggestedAdjustments
      });
    }

    return review;
  }
}
```

### Business Impact

- **Backlist conversion** at lower cost than traditional methods
- **New revenue stream** from audio-only customers
- **Automated quality control** with human review for edge cases

---

## Use Case 5: Author Voice Cloning

### Problem

Authors want their own voice on their audiobooks but lack recording equipment or time for full production.

### Solution

Clone author's voice from sample recording and generate full audiobook.

### Implementation

```python
class AuthorVoiceCloning:
    def __init__(self, nexus_client):
        self.audiobook = nexus_client.plugin("nexus-audiobook")

    async def clone_author_voice(self, author_info: dict, audio_sample: str):
        # Clone voice from sample (minimum 30 seconds)
        clone = await self.audiobook.voices.clone({
            "sample_url": audio_sample,
            "voice_name": f"{author_info['name']}_voice",
            "training_iterations": 1000,  # Higher = more accurate
            "preserve_accent": True,
            "consent_verified": True  # Required for ethical voice cloning
        })

        # Validate clone quality
        validation = await self.audiobook.voices.validate({
            "original_sample": audio_sample,
            "cloned_voice_id": clone.voice_id,
            "test_phrases": [
                "The quick brown fox jumps over the lazy dog.",
                author_info["signature_phrase"]
            ]
        })

        return {
            "voice": clone,
            "quality_score": validation.similarity_score,
            "ready_for_production": validation.similarity_score > 0.85
        }

    async def produce_with_author_voice(self, project_id: str, author_voice_id: str):
        # Assign author's cloned voice as narrator
        await self.audiobook.projects.assign_voices({
            "project_id": project_id,
            "narrator": author_voice_id,
            "use_for_all_dialogue": False  # Use character voices for dialogue
        })

        # Generate with author narration
        return await self.audiobook.projects.generate({
            "project_id": project_id,
            "author_narrated": True
        })
```

### Business Impact

- **Authentic author voice** without extensive studio time
- **Personal connection** with readers
- **Differentiation opportunity** for author-narrated editions

---

## Integration with Nexus Ecosystem

| Plugin | Integration |
|--------|-------------|
| **ProseCreator** | Direct manuscript import |
| **BookMarketing** | Audiobook promotions |
| **FileProcess** | Audio format conversion |
| **GraphRAG** | Character voice consistency |

---

## Next Steps

- [Architecture Overview](./ARCHITECTURE.md) - Voice technology and processing
- [API Reference](./docs/api-reference/endpoints.md) - Complete endpoint docs
- [Support](https://discord.gg/adverant) - Discord community
