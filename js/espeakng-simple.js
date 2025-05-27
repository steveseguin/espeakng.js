/*
 * espeakng-simple.js - Simplified vanilla JS wrapper for eSpeak-ng
 * 
 * This wrapper provides a clean API to generate speech audio data
 * without handling playback, allowing you to use your own audio system.
 */

(function(window) {
  'use strict';

  // Simple TTS class that just returns audio data
  function SimpleTTS(options) {
    options = options || {};
    this.workerPath = options.workerPath || 'js/espeakng.worker.js';
    this.ready = false;
    this.readyCallbacks = [];
    this._initWorker();
  }

  SimpleTTS.prototype._initWorker = function() {
    this.worker = new Worker(this.workerPath);
    this.worker.onmessage = function(e) {
      if (e.data === 'ready') {
        this.ready = true;
        this.worker.onmessage = this._handleMessage.bind(this);
        this._executeReadyCallbacks();
      }
    }.bind(this);
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

  SimpleTTS.prototype._executeReadyCallbacks = function() {
    while (this.readyCallbacks.length) {
      this.readyCallbacks.shift()();
    }
  };

  SimpleTTS.prototype.onReady = function(callback) {
    if (this.ready) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  };

  // Get list of available voices
  SimpleTTS.prototype.getVoices = function(callback) {
    this._sendMessage('list_voices', [], callback);
  };

  // Generate speech and return audio data
  SimpleTTS.prototype.speak = function(text, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    
    var self = this;
    var audioChunks = [];
    
    // Apply options if provided
    if (options.voice) {
      this._sendMessage('set_voice', [options.voice]);
    }
    if (options.rate !== undefined) {
      this._sendMessage('set_rate', [options.rate]);
    }
    if (options.pitch !== undefined) {
      this._sendMessage('set_pitch', [options.pitch]);
    }
    
    // Synthesize speech
    this._sendMessage('synthesize', [text], function(samples, events) {
      if (samples) {
        audioChunks.push(new Float32Array(samples));
      } else {
        // Done - merge chunks and return
        var audioData = self._mergeAudioChunks(audioChunks);
        callback(audioData);
      }
    });
  };

  // Helper to merge audio chunks into single Float32Array
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

  // Send message to worker
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
    
    this.worker.postMessage(message);
  };

  // Export to window
  window.SimpleTTS = SimpleTTS;

})(window);