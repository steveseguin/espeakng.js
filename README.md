# espeakng.js-cdn

This repository contains the latest compiled and minified version of
[espeakng.js](https://github.com/espeak-ng/espeak-ng/tree/master/emscripten),
the Javascript port of
[eSpeak-ng](https://github.com/espeak-ng/espeak-ng)
via
[emscripten](http://emscripten.org).

[espeakng.js](https://github.com/espeak-ng/espeak-ng/tree/master/emscripten)
allows client-side text-to-speech synthesis in any browser
supporting Web workers and the Web Audio API.

* Version: 1.49.1
* Date: 2017-02-01
* License: the GNU General Public License, Version 3 (GPLv3)
* Size: 3.2 MB (including all the voices)

## Quick Start - Simplified API

The simplified API (`espeakng-simple.js`) provides a clean interface that returns audio data without handling playback, allowing you to use your own audio system:

```javascript
// Initialize
const tts = new SimpleTTS({
  workerPath: 'js/espeakng.worker.js'
});

// Wait for initialization
tts.onReady(function() {
  // Get voices
  tts.getVoices(function(voices) {
    console.log('Available voices:', voices);
  });
  
  // Generate speech
  tts.speak('Hello world!', function(audioData) {
    // audioData is a Float32Array
    // Use your own audio playback system
    playAudio(audioData);
  });
  
  // With options
  tts.speak('Hello world!', {
    voice: 'en',    // Voice identifier
    rate: 200,      // 80-450
    pitch: 75       // 0-100
  }, function(audioData) {
    // Handle audio data
  });
});
```

## Download

The following files are available:

* `js/espeakng.js` - Original API
* `js/espeakng.min.js` - Original API (minified)
* `js/espeakng-simple.js` - Simplified vanilla JS API
* `js/espeakng.worker.js` - Web Worker (required)
* `js/espeakng.worker.data` - Voice data (required)

### Via CDN

```
# Latest version
https://cdn.jsdelivr.net/gh/pettarin/espeakng.js-cdn@latest/js/espeakng-simple.js
https://cdn.jsdelivr.net/gh/pettarin/espeakng.js-cdn@latest/js/espeakng.worker.js
https://cdn.jsdelivr.net/gh/pettarin/espeakng.js-cdn@latest/js/espeakng.worker.data

# Specific version
https://cdn.jsdelivr.net/gh/pettarin/espeakng.js-cdn@1.49.1/js/espeakng.min.js
https://cdn.jsdelivr.net/gh/pettarin/espeakng.js-cdn@1.49.1/js/espeakng.worker.js
https://cdn.jsdelivr.net/gh/pettarin/espeakng.js-cdn@1.49.1/js/espeakng.worker.data
```

## Demo Files

* `index.html` - Documentation and links to demos
* `simple-demo.html` - Demo of the simplified API
* `demo.min.html` - Demo of the original API

## SimpleTTS API Reference

### Constructor
```javascript
new SimpleTTS(options)
```
Options:
- `workerPath`: Path to espeakng.worker.js (default: 'js/espeakng.worker.js')

### Methods

#### onReady(callback)
Called when the TTS engine is initialized and ready to use.

#### getVoices(callback)
Returns an array of available voices with their properties.

#### speak(text, [options], callback)
Generates speech audio data.

Parameters:
- `text`: String to synthesize
- `options` (optional):
  - `voice`: Voice identifier (e.g., 'en', 'es', 'fr')
  - `rate`: Speech rate (80-450, default: 175)
  - `pitch`: Voice pitch (0-100, default: 50)
- `callback`: Function that receives Float32Array of audio samples

## Important Notes

1. **Audio Context**: Modern browsers require AudioContext to be created after user interaction. Make sure to handle this in your audio playback code.

2. **CORS**: When using the CDN, ensure your server has proper CORS headers if loading from a different domain.

3. **Worker Path**: The worker must be able to find `espeakng.worker.data` in the same directory.

## Original API

The original API is still available via `espeakng.js` and `espeakng.min.js`. See the original documentation for details.

## Upload A New Version

Since auto-updating is enabled,
to make a new version available on jsdelivr,
just do (in this repository) the following:

1. copy the new JS/data files from the [eSpeak-ng](https://github.com/espeak-ng/espeak-ng/tree/master/emscripten) project in the `js/` directory;
2. create a new [release](https://github.com/pettarin/espeakng.js-cdn/releases), following semver.

The configuration settings for jsdelivr are
[here](https://github.com/jsdelivr/jsdelivr/tree/master/files/espeakng.js).

## License

GNU General Public License, Version 3 (GPLv3)