# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-29

### Added
- Initial release of Audiobook plugin
- Multi-provider TTS support (ElevenLabs, XTTS-v2, PlayHT)
- AI-powered voice matching based on character profiles
- Voice cloning with 30-second audio samples
- Professional audio assembly with -23 LUFS normalization
- M4B export with chapter markers
- MP3 export for universal compatibility
- WebSocket streaming for real-time progress
- Integration with ProseCreator for content sourcing

### Technical
- Express.js HTTP server with TypeScript
- WebSocket server for real-time updates
- FFmpeg integration for audio processing
- ID3 metadata support
- PostgreSQL for project data
