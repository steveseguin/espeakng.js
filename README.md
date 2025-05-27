# espeakng.js

Professional browser text-to-speech with advanced audio enhancement. No servers, no APIs, no dependencies.

## Features

- 🎯 **Vanilla JavaScript** - No frameworks required
- 🔊 **Studio-Quality Audio** - Professional audio processing pipeline
- 🌍 **100+ Languages** - Comprehensive voice support
- ⚡ **Runs Offline** - Everything in the browser
- 🎚️ **Audio Enhancement** - 6-stage processing for clarity
- 📦 **3.2 MB Total** - All voices included

## What's New: Professional Audio Enhancement

The library now includes a sophisticated audio processing pipeline that dramatically improves speech quality:

- **Pre-emphasis Filter** - Boosts high frequencies for clarity
- **Noise Gate** - Removes background noise between words
- **Spectral Enhancement** - Adds richness and depth
- **De-esser** - Reduces harsh sibilant sounds
- **Dynamic Compression** - Ensures consistent volume
- **Intelligent Normalization** - Optimizes loudness without clipping

## Quick Start

```javascript
// Initialize with enhanced audio (default)
const tts = new SimpleTTS();

// Generate professional-quality speech
tts.onReady(() => {
  tts.speak('Hello world!', audioData => {
    SimpleTTS.playAudioData(audioData);
  });
});
```

## Installation

Download these files:
1. `espeakng-simple.js` - Main library with audio enhancement
2. `espeakng.worker.js` - Web Worker
3. `espeakng.worker.data` - Voice data (same folder as worker)

Or use CDN:
```html
<script src="https://cdn.jsdelivr.net/gh/steveseguin/espeakng.js-cdn@latest/js/espeakng-simple.js"></script>
```

## API

### new SimpleTTS(options)
- `options.workerPath` - Path to worker (default: 'js/espeakng.worker.js')
- `options.defaultVoice` - Default voice (default: 'en-us')
- `options.defaultVolume` - Default volume (default: 1.0)
- `options.enhanceAudio` - Enable enhancement (default: true)

### tts.speak(text, [options], callback)
```javascript
tts.speak('Hello', {
  voice: 'en-us',   // Voice ID
  rate: 175,        // Speed (80-450)
  pitch: 50,        // Pitch (0-100)
  volume: 1.0,      // Volume (0-2.0)
  enhance: true     // Audio enhancement (default: true)
}, audioData => {
  // Float32Array with processed audio
});
```

### Built-in Helpers

```javascript
// Play audio instantly
SimpleTTS.playAudioData(audioData);

// Play with reverb for warmth
SimpleTTS.playAudioData(audioData, { reverb: true });

// Create AudioBuffer
const buffer = SimpleTTS.createAudioBuffer(audioData);
```

## Compare Audio Quality

Try the [comparison demo](compare-demo.html) to hear the difference between standard and enhanced audio.

## Disable Enhancement

For raw eSpeak-ng output:
```javascript
// Globally
const tts = new SimpleTTS({ enhanceAudio: false });

// Per request
tts.speak('Hello', { enhance: false }, callback);
```

## Example

```javascript
const tts = new SimpleTTS();

tts.onReady(() => {
  // List voices
  tts.getVoices(voices => {
    console.log(voices);
  });
  
  // Speak with all options
  tts.speak('Hello world!', {
    voice: 'en-us',
    rate: 200,
    volume: 1.2,
    enhance: true
  }, audioData => {
    // Play with reverb
    SimpleTTS.playAudioData(audioData, { reverb: true });
  });
});
```

## Demos

- `simple-demo.html` - Basic demo with controls
- `compare-demo.html` - Compare standard vs enhanced audio

## License

GPLv3