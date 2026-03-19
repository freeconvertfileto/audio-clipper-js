# Audio Clipper

Trim audio files to a precise time range with waveform visualization, entirely in the browser.

**Live Demo:** https://file-converter-free.com/en/audio-tools/trim-audio-online-free

## How It Works

The audio file is decoded into an `AudioBuffer` using `AudioContext.decodeAudioData()`. WaveSurfer.js renders an interactive waveform visualization. Two draggable handles (start and end) are overlaid on the waveform — these store their positions as ratios (0–1) of the total duration, with touch event support for mobile. When the user clicks Trim, `trimAudio()` creates a new `AudioBuffer` sized to the selected duration and copies the channel data slice from the original buffer. For WAV export, `audioBufferToWav()` manually constructs the binary RIFF/WAVE header (44 bytes: chunk IDs, sample rate, bit depth, channel count) followed by interleaved 16-bit PCM samples written via `DataView`. For WebM export, the audio is played through an `AudioContext.createMediaStreamDestination()` node and captured with `MediaRecorder`.

## Features

- WaveSurfer.js waveform visualization with draggable start/end trim handles
- Touch support for mobile trim handle interaction
- WAV export via manually written RIFF/WAVE binary (44-byte header + 16-bit PCM)
- WebM/Opus export via MediaRecorder on a MediaStreamDestination node
- Real-time playback of the trimmed region

## Browser APIs Used

- Web Audio API (`AudioContext`, `decodeAudioData`, `AudioBuffer`, `createMediaStreamDestination`)
- WaveSurfer.js for waveform rendering
- MediaRecorder API for WebM export
- FileReader API (`readAsArrayBuffer`)
- DataView for WAV binary writing

## Code Structure

| File | Description |
|------|-------------|
| `audio-clipper.js` | `AudioClipper` class — WaveSurfer integration, drag handles with touch support, WAV binary writer, MediaRecorder export |

## Usage

| Element ID | Purpose |
|------------|---------|
| `dropZone` | Drag-and-drop target for audio file |
| `fileInput` | File picker input |
| `waveform` | WaveSurfer waveform container |
| `startHandle` | Draggable trim start position handle |
| `endHandle` | Draggable trim end position handle |
| `startTime` | Numeric start time display |
| `endTime` | Numeric end time display |
| `playBtn` | Play trimmed region preview |
| `exportFormat` | Output format selector (WAV / WebM) |
| `downloadBtn` | Download trimmed audio |

## License

MIT
