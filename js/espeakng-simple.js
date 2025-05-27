/*
 * espeakng-simple.js - Enhanced wrapper for eSpeak-ng with advanced audio processing
 */

(function(window) {
  'use strict';

  function SimpleTTS(options) {
    options = options || {};
    this.workerPath = options.workerPath || 'js/espeakng.worker.js';
    this.defaultVoice = options.defaultVoice || 'en-us';
    this.defaultRate = options.defaultRate || 175;
    this.defaultPitch = options.defaultPitch || 50;
    this.defaultVolume = options.defaultVolume || 1.0;
    this.enhanceAudio = options.enhanceAudio !== false; // Default true
    this.ready = false;
    this.readyCallbacks = [];
    this._initWorker();
  }

  SimpleTTS.prototype._initWorker = function() {
    var self = this;
    try {
      this.worker = new Worker(this.workerPath);
      this.worker.onmessage = function(e) {
        if (e.data === 'ready') {
          self.ready = true;
          self.worker.onmessage = self._handleMessage.bind(self);
          self._executeReadyCallbacks();
        }
      };
      this.worker.onerror = function(error) {
        console.error('SimpleTTS Worker Error:', error);
        self._executeReadyCallbacks(error);
      };
    } catch (error) {
      console.error('SimpleTTS Init Error:', error);
      setTimeout(function() {
        self._executeReadyCallbacks(error);
      }, 0);
    }
  };

  SimpleTTS.prototype._handleMessage = function(evt) {
    var callback = evt.data.callback;
    if (callback && this[callback]) {
      this[callback].apply(this, evt.data.result);
      if (evt.data.done) {
        delete this[callback];
      }
    }
  };

  SimpleTTS.prototype._executeReadyCallbacks = function(error) {
    while (this.readyCallbacks.length) {
      this.readyCallbacks.shift()(error);
    }
  };

  SimpleTTS.prototype.onReady = function(callback) {
    if (this.ready) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  };

  SimpleTTS.prototype.getVoices = function(callback) {
    if (!this.ready) {
      callback([]);
      return;
    }
    this._sendMessage('list_voices', [], callback);
  };

  SimpleTTS.prototype.speak = function(text, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    
    if (!this.ready) {
      console.error('SimpleTTS: Not ready yet');
      callback(null);
      return;
    }
    
    var self = this;
    var audioChunks = [];
    
    // Apply options with defaults
    var voice = options.voice || this.defaultVoice;
    var rate = options.rate !== undefined ? options.rate : this.defaultRate;
    var pitch = options.pitch !== undefined ? options.pitch : this.defaultPitch;
    var volume = options.volume !== undefined ? options.volume : this.defaultVolume;
    var enhance = options.enhance !== undefined ? options.enhance : this.enhanceAudio;
    
    // Set voice parameters
    this._sendMessage('set_voice', [voice]);
    this._sendMessage('set_rate', [rate]);
    this._sendMessage('set_pitch', [pitch]);
    
    // Synthesize speech
    this._sendMessage('synthesize', [text], function(samples, events) {
      if (samples) {
        audioChunks.push(new Float32Array(samples));
      } else {
        // Done - process audio
        var audioData = self._mergeAudioChunks(audioChunks);
        
        // Apply enhancement if enabled
        if (enhance) {
          audioData = self._enhanceAudio(audioData, 22050);
        }
        
        // Apply volume and normalization
        audioData = self._processAudio(audioData, volume);
        
        callback(audioData);
      }
    });
  };

  // Enhanced audio processing pipeline
  SimpleTTS.prototype._enhanceAudio = function(audioData, sampleRate) {
    // 1. Apply pre-emphasis filter to boost high frequencies
    var preEmphasis = this._applyPreEmphasis(audioData);
    
    // 2. Apply noise gate to remove quiet background noise
    var gated = this._applyNoiseGate(preEmphasis);
    
    // 3. Apply spectral enhancement
    var enhanced = this._applySpectralEnhancement(gated);
    
    // 4. Apply de-esser to reduce harsh 's' sounds
    var deessed = this._applyDeEsser(enhanced, sampleRate);
    
    return deessed;
  };

  // Pre-emphasis filter to boost clarity
  SimpleTTS.prototype._applyPreEmphasis = function(input) {
    var output = new Float32Array(input.length);
    var alpha = 0.95;
    
    output[0] = input[0];
    for (var i = 1; i < input.length; i++) {
      output[i] = input[i] - alpha * input[i - 1];
    }
    
    // Normalize after pre-emphasis
    var max = 0;
    for (var i = 0; i < output.length; i++) {
      max = Math.max(max, Math.abs(output[i]));
    }
    if (max > 0) {
      var scale = 0.8 / max;
      for (var i = 0; i < output.length; i++) {
        output[i] *= scale;
      }
    }
    
    return output;
  };

  // Noise gate to remove background noise
  SimpleTTS.prototype._applyNoiseGate = function(input) {
    var output = new Float32Array(input.length);
    var threshold = 0.02;
    var lookAhead = 64;
    var hold = 32;
    var release = 128;
    
    var gateOpen = false;
    var holdCounter = 0;
    var releaseCounter = 0;
    
    for (var i = 0; i < input.length; i++) {
      // Look ahead for signal
      var futureMax = 0;
      for (var j = i; j < Math.min(i + lookAhead, input.length); j++) {
        futureMax = Math.max(futureMax, Math.abs(input[j]));
      }
      
      if (futureMax > threshold) {
        gateOpen = true;
        holdCounter = hold;
        releaseCounter = release;
      } else if (holdCounter > 0) {
        holdCounter--;
      } else if (releaseCounter > 0) {
        releaseCounter--;
        var gain = releaseCounter / release;
        output[i] = input[i] * gain;
        continue;
      } else {
        gateOpen = false;
      }
      
      output[i] = gateOpen ? input[i] : 0;
    }
    
    return output;
  };

  // Spectral enhancement using comb filtering
  SimpleTTS.prototype._applySpectralEnhancement = function(input) {
    var output = new Float32Array(input.length);
    var delayLength = 15; // Samples
    var feedback = 0.2;
    var mix = 0.3;
    
    for (var i = 0; i < input.length; i++) {
      if (i < delayLength) {
        output[i] = input[i];
      } else {
        var delayed = output[i - delayLength];
        var enhanced = input[i] + delayed * feedback;
        output[i] = input[i] * (1 - mix) + enhanced * mix;
      }
    }
    
    return output;
  };

  // De-esser to reduce harsh sibilants
  SimpleTTS.prototype._applyDeEsser = function(input, sampleRate) {
    var output = new Float32Array(input.length);
    var centerFreq = 6000 / sampleRate;
    var bandwidth = 2000 / sampleRate;
    
    // Simple high-frequency detector
    var prevSample = 0;
    var threshold = 0.3;
    var reduction = 0.5;
    
    for (var i = 0; i < input.length; i++) {
      var highFreqEnergy = Math.abs(input[i] - prevSample);
      
      if (highFreqEnergy > threshold) {
        // Reduce high frequency content
        output[i] = input[i] * reduction + prevSample * (1 - reduction);
      } else {
        output[i] = input[i];
      }
      
      prevSample = input[i];
    }
    
    return output;
  };

  // Enhanced audio normalization with compression
  SimpleTTS.prototype._processAudio = function(audioData, volume) {
    // Multi-stage processing
    
    // 1. Apply gentle compression
    var compressed = this._applyCompression(audioData);
    
    // 2. Normalize with intelligent peak detection
    var normalized = this._normalizeAudio(compressed, volume);
    
    // 3. Apply final limiting
    var limited = this._applyLimiting(normalized);
    
    return limited;
  };

  // Gentle compression for consistent volume
  SimpleTTS.prototype._applyCompression = function(input) {
    var output = new Float32Array(input.length);
    var threshold = 0.5;
    var ratio = 2.5;
    var attack = 0.002;
    var release = 0.05;
    var envelope = 0;
    var gain = 1;
    
    for (var i = 0; i < input.length; i++) {
      var inputLevel = Math.abs(input[i]);
      
      // Update envelope
      var rate = inputLevel > envelope ? attack : release;
      envelope += (inputLevel - envelope) * rate;
      
      // Calculate gain reduction
      if (envelope > threshold) {
        var excess = envelope - threshold;
        var compressedExcess = excess / ratio;
        gain = (threshold + compressedExcess) / envelope;
      } else {
        gain = 1;
      }
      
      output[i] = input[i] * gain * 1.2; // Makeup gain
    }
    
    return output;
  };

  // Intelligent normalization
  SimpleTTS.prototype._normalizeAudio = function(input, volume) {
    // Analyze audio in chunks to find true peak
    var chunkSize = 512;
    var peaks = [];
    
    for (var i = 0; i < input.length; i += chunkSize) {
      var chunkPeak = 0;
      for (var j = i; j < Math.min(i + chunkSize, input.length); j++) {
        chunkPeak = Math.max(chunkPeak, Math.abs(input[j]));
      }
      if (chunkPeak > 0.01) { // Ignore silence
        peaks.push(chunkPeak);
      }
    }
    
    if (peaks.length === 0) return input;
    
    // Use 90th percentile for normalization
    peaks.sort(function(a, b) { return a - b; });
    var targetPeak = peaks[Math.floor(peaks.length * 0.9)];
    
    // Calculate gain
    var gain = (0.75 / targetPeak) * volume;
    
    // Apply gain with soft clipping
    var output = new Float32Array(input.length);
    for (var i = 0; i < input.length; i++) {
      output[i] = input[i] * gain;
    }
    
    return output;
  };

  // Final limiting to prevent clipping
  SimpleTTS.prototype._applyLimiting = function(input) {
    var output = new Float32Array(input.length);
    var threshold = 0.95;
    var lookahead = 32;
    var release = 64;
    
    for (var i = 0; i < input.length; i++) {
      // Look ahead for peaks
      var futureMax = Math.abs(input[i]);
      for (var j = i + 1; j < Math.min(i + lookahead, input.length); j++) {
        futureMax = Math.max(futureMax, Math.abs(input[j]));
      }
      
      if (futureMax > threshold) {
        var gain = threshold / futureMax;
        output[i] = input[i] * gain;
      } else {
        output[i] = input[i];
      }
      
      // Soft clipping for any remaining peaks
      if (output[i] > 0.99) {
        output[i] = 0.99;
      } else if (output[i] < -0.99) {
        output[i] = -0.99;
      }
    }
    
    return output;
  };

  SimpleTTS.prototype._mergeAudioChunks = function(chunks) {
    var totalLength = chunks.reduce(function(sum, chunk) {
      return sum + chunk.length;
    }, 0);
    
    var result = new Float32Array(totalLength);
    var offset = 0;
    
    chunks.forEach(function(chunk) {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    
    return result;
  };

  SimpleTTS.prototype._sendMessage = function(method, args, callback) {
    var message = { 
      method: method, 
      args: args || []
    };
    
    if (callback) {
      var callbackId = '_' + method + '_' + Math.random().toString().substring(2) + '_cb';
      this[callbackId] = callback;
      message.callback = callbackId;
    }
    
    try {
      this.worker.postMessage(message);
    } catch (error) {
      console.error('SimpleTTS postMessage error:', error);
      if (callback) {
        delete this[callbackId];
        callback(null);
      }
    }
  };

  // Utility function to create AudioBuffer
  SimpleTTS.createAudioBuffer = function(audioData, sampleRate) {
    sampleRate = sampleRate || 22050;
    
    if (!window.AudioContext && !window.webkitAudioContext) {
      console.error('AudioContext not supported');
      return null;
    }
    
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var buffer = ctx.createBuffer(1, audioData.length, sampleRate);
    buffer.getChannelData(0).set(audioData);
    
    return buffer;
  };

  // Enhanced playback with optional effects
  SimpleTTS.playAudioData = function(audioData, options) {
    options = options || {};
    var sampleRate = options.sampleRate || 22050;
    
    if (!window.AudioContext && !window.webkitAudioContext) {
      console.error('AudioContext not supported');
      return null;
    }
    
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    var buffer = ctx.createBuffer(1, audioData.length, sampleRate);
    buffer.getChannelData(0).set(audioData);
    
    var source = ctx.createBufferSource();
    source.buffer = buffer;
    
    // Optional: Add subtle reverb for warmth
    if (options.reverb) {
      var convolver = ctx.createConvolver();
      var reverbTime = 0.15;
      var reverbDecay = 2;
      var reverbBuffer = ctx.createBuffer(2, sampleRate * reverbTime, sampleRate);
      
      for (var channel = 0; channel < 2; channel++) {
        var channelData = reverbBuffer.getChannelData(channel);
        for (var i = 0; i < channelData.length; i++) {
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / channelData.length, reverbDecay);
        }
      }
      
      convolver.buffer = reverbBuffer;
      
      var dry = ctx.createGain();
      var wet = ctx.createGain();
      dry.gain.value = 0.9;
      wet.gain.value = 0.1;
      
      source.connect(dry);
      source.connect(convolver);
      convolver.connect(wet);
      dry.connect(ctx.destination);
      wet.connect(ctx.destination);
    } else {
      source.connect(ctx.destination);
    }
    
    source.start();
    
    return {
      context: ctx,
      source: source,
      stop: function() {
        try {
          source.stop();
        } catch (e) {}
      }
    };
  };

  window.SimpleTTS = SimpleTTS;

})(window);