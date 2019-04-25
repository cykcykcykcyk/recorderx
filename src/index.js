import {
  merge,
  compress,
  encodeToPCM,
  encodeToWAV,
} from './tools';
import environmentCheck from './polyfill';
import DEFAULT_CONFIG from './config';
import { RECORDER_STATE, ENCODE_TYPE } from './enum';

class Recorderx {
  static audioContext = new (window.AudioContext || window.webkitAudioContext)()

  sampleRate = DEFAULT_CONFIG.sampleRate

  sampleBits = DEFAULT_CONFIG.sampleBits

  recordable = DEFAULT_CONFIG.recordable

  recorder = null

  source = null

  stream = null

  buffer = []

  bufferSize = 0

  xstate = RECORDER_STATE.READY

  get state () {
    return this.xstate;
  }

  constructor (
    {
      recordable = DEFAULT_CONFIG.recordable,
      bufferSize = DEFAULT_CONFIG.bufferSize,
      sampleRate = DEFAULT_CONFIG.sampleRate,
      sampleBits = DEFAULT_CONFIG.sampleBits,
    } = DEFAULT_CONFIG,
  ) {
    const ctx = Recorderx.audioContext;
    const creator = ctx.createScriptProcessor || ctx.createJavaScriptNode;
    this.recorder = creator.call(ctx, bufferSize, 1, 1);
    this.recordable = recordable;
    this.sampleRate = sampleRate;
    this.sampleBits = sampleBits;
  }

  start (audioprocessCallback) {
    Recorderx.audioContext.resume();

    return new Promise((resolve, reject) => {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const { recorder } = this;
          const source = Recorderx.audioContext.createMediaStreamSource(stream);

          this.stream = stream;
          this.source = source;

          recorder.onaudioprocess = (e) => {
            const channelData = e.inputBuffer.getChannelData(0);

            if (this.recordable) {
              this.buffer.push(channelData.slice(0));
              this.bufferSize += channelData.length;
            }

            if (typeof audioprocessCallback === 'function') {
              audioprocessCallback(channelData);
            }
          };

          source.connect(recorder);
          recorder.connect(Recorderx.audioContext.destination);

          this.xstate = RECORDER_STATE.RECORDING;

          resolve(stream);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  pause () {
    this.stream.getAudioTracks()[0].stop();
    this.recorder.disconnect();
    this.source.disconnect();
    Recorderx.audioContext.suspend();
    this.xstate = RECORDER_STATE.READY;
  }

  clear () {
    this.buffer = [];
    this.bufferSize = 0;
  }

  getRecord ({
    encodeTo = ENCODE_TYPE.RAW,
    compressable = false,
  } = {
    encodeTo: ENCODE_TYPE.RAW,
    compressable: false,
  }) {
    if (this.recordable) {
      let buffer = merge(this.buffer, this.bufferSize);

      const inputSampleRate = Recorderx.audioContext.sampleRate;
      compressable = compressable && (this.sampleRate < inputSampleRate);
      const outSampleRate = compressable ? this.sampleRate : inputSampleRate;

      if (compressable) {
        buffer = compress(buffer, inputSampleRate, outSampleRate);
      }

      switch (encodeTo) {
        case ENCODE_TYPE.RAW:
          return buffer;
        case ENCODE_TYPE.PCM:
          return encodeToPCM(buffer, this.sampleBits);
        case ENCODE_TYPE.WAV:
          return encodeToWAV(buffer, this.sampleBits, outSampleRate);
        default:
          throw new Error('Invalid parameter: "encodeTo" must be ENCODE_TYPE');
      }
    }

    throw new Error('Configuration error: "recordable" must be set to true');
  }
}

environmentCheck();

export const audioTools = {
  merge,
  compress,
  encodeToPCM,
  encodeToWAV,
};
export { RECORDER_STATE, ENCODE_TYPE };
export default Recorderx;
