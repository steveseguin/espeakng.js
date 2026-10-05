const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const pagePath = process.env.COMPARE_DEMO_PATH || path.join(root, 'compare-demo.html');
const page = fs.readFileSync(pagePath, 'utf8');
const inlineScript = [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).filter(script => script.trim()).join('\n');
const wrapper = fs.readFileSync(path.join(root, 'js/espeakng-simple.js'), 'utf8');

async function loadDemo(sampleRate = 22050) {
  const elements = new Map();
  for (const id of ['standard-btn', 'enhanced-btn', 'standard-card', 'enhanced-card',
    'status', 'voice', 'text', 'rate', 'pitch', 'volume', 'rate-value', 'pitch-value', 'volume-value']) {
    const classes = new Set();
    elements.set(id, {
      value: '', disabled: id.endsWith('-btn'), textContent: '', innerHTML: '',
      classList: { add: value => classes.add(value), remove: value => classes.delete(value) },
      appendChild(option) { if (!this.value || option.selected) this.value = option.value; }
    });
  }
  for (const [id, value] of Object.entries({text: 'Hello world', rate: '175', pitch: '50', volume: '100'})) {
    elements.get(id).value = value;
  }
  const errors = [];
  const sources = [];
  const buffers = [];
  const messages = [];
  class Worker {
    constructor() { queueMicrotask(() => this.onmessage({data: 'ready'})); }
    postMessage(message) {
      messages.push(message);
      const respond = (result, done = true) => queueMicrotask(() => this.onmessage({
        data: {callback: message.callback, result, done}
      }));
      if (message.method === 'get_samplerate') respond([sampleRate]);
      if (message.method === 'list_voices') {
        respond([[{identifier: 'en', name: 'English', languages: [{name: 'English'}]}]]);
      }
      if (message.method === 'synthesize') {
        respond([new Float32Array([0.1, 0.2]), []], false);
        respond([new Float32Array([0.3, 0.4]), []], false);
        respond([null, []]);
      }
    }
  }
  class AudioContext {
    constructor() { this.destination = {}; this.state = 'running'; }
    createBuffer(channels, length, rate) {
      const samples = new Float32Array(length);
      const buffer = {channels, length, sampleRate: rate, getChannelData: () => samples};
      buffers.push(buffer);
      return buffer;
    }
    createBufferSource() {
      const source = {connect() {}, start() { this.started = true; }, stop() {}};
      sources.push(source);
      return source;
    }
  }
  const sandbox = {
    Worker, AudioContext, Float32Array, queueMicrotask, setTimeout,
    console: {log() {}, error: (...args) => errors.push(args)},
    document: {getElementById: id => elements.get(id), createElement: () => ({})}
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(wrapper, sandbox, {filename: 'espeakng-simple.js'});
  vm.runInContext(inlineScript, sandbox, {filename: 'compare-demo.html'});
  const settle = () => new Promise(resolve => setImmediate(resolve));
  await settle();
  return {elements, errors, sources, buffers, messages, settle};
}

for (const mode of ['standard', 'enhanced']) {
  for (const sampleRate of [11025, 22050]) {
    test(`${mode} playback receives ${sampleRate} Hz and re-enables controls on completion`, async () => {
      const demo = await loadDemo(sampleRate);
      assert.equal(demo.elements.get('standard-btn').disabled, false);
      assert.equal(demo.elements.get('enhanced-btn').disabled, false);
      demo.elements.get(`${mode}-btn`).onclick();
      await demo.settle();
      assert.equal(demo.sources.length, 1, 'Speech should create a playable audio source');
      assert.equal(demo.sources[0].started, true);
      assert.equal(demo.buffers[0].sampleRate, sampleRate);
      assert.equal(demo.buffers[0].channels, 1);
      assert.equal(demo.buffers[0].length, 4);
      assert.equal(demo.elements.get('standard-btn').disabled, true);
      assert.equal(demo.elements.get('enhanced-btn').disabled, true);
      demo.sources[0].onended();
      assert.equal(demo.elements.get('standard-btn').disabled, false);
      assert.equal(demo.elements.get('enhanced-btn').disabled, false);
      assert.equal(demo.elements.get('status').textContent, 'Ready! Try the other mode to compare.');
      assert.deepEqual(demo.errors, []);
    });
  }
}

test('both modes can be played sequentially with separate audio sources', async () => {
  const demo = await loadDemo();
  for (const [index, mode] of ['standard', 'enhanced', 'standard'].entries()) {
    demo.elements.get(`${mode}-btn`).onclick();
    await demo.settle();
    assert.equal(demo.sources.length, index + 1);
    demo.sources[index].onended();
  }
  assert.equal(demo.messages.filter(message => message.method === 'synthesize').length, 3);
  assert.equal(demo.elements.get('standard-btn').disabled, false);
  assert.equal(demo.elements.get('enhanced-btn').disabled, false);
  assert.deepEqual(demo.errors, []);
});

test('standard/enhanced selection still controls the existing audio processing', async () => {
  const demo = await loadDemo();
  demo.elements.get('standard-btn').onclick();
  await demo.settle();
  assert.equal(demo.sources.length, 1);
  const original = Array.from(demo.buffers[0].getChannelData(0));
  demo.sources[0].onended();
  demo.elements.get('enhanced-btn').onclick();
  await demo.settle();
  assert.equal(demo.sources.length, 2);
  const enhanced = Array.from(demo.buffers[1].getChannelData(0));
  assert.equal(original.length, enhanced.length);
  assert.notDeepEqual(original, enhanced);
  assert.ok(enhanced[1] > original[1]);
  demo.sources[1].onended();
});
