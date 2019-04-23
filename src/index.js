import {
  merge,
  compress,
  encodeWAV,
} from './tools';
import environmentCheck from './polyfill';
import DEFAULT_CONFIG from './config';
import RECORDER_STATE from './state';

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

  xstate = RECORDER_STATE.READY;

  constructor (
    {
      recordable = DEFAULT_CONFIG.recordable,
      bufferSize = DEFAULT_CONFIG.bufferSize,
      sampleRate = DEFAULT_CONFIG.sampleRate,
      sampleBits = DEFAULT_CONFIG.sampleBits,
    } = DEFAULT_CONFIG,
  ) {
    this.recordable = recordable;
    this.sampleRate = sampleRate;
    this.sampleBits = sampleBits;
    this.recorder = Recorderx.audioContext.createScriptProcessor(bufferSize, 1, 1);
  }

  get state () {
    return this.xstate;
  }

  start (audioprocessCallback) {
    Recorderx.audioContext.resume();

    return new Promise((resolve, reject) => {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const source = Recorderx.audioContext.createMediaStreamSource(stream);
          const { recorder } = this;

          this.stream = stream;
          this.source = source;

          recorder.onaudioprocess = (e) => {
            const data = e.inputBuffer.getChannelData(0);

            if (this.recordable) {
              this.buffer.push(new Float32Array(data));
              this.bufferSize += data.length;
            }

            if (typeof audioprocessCallback === 'function') {
              audioprocessCallback(data);
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
    this.recorder.disconnect();
    this.source.disconnect();
    this.stream.getAudioTracks()[0].stop();
    Recorderx.audioContext.suspend();
    this.xstate = RECORDER_STATE.READY;
  }

  clear () {
    this.buffer = [];
    this.bufferSize = 0;
  }

  getRecord ({
    encodeTo = undefined,
    compressable = false,
  } = {
    encodeTo: undefined,
    compressable: false,
  }) {
    if (this.recordable) {
      let buffer = merge(this.buffer, this.bufferSize);

      const actSampleRate = Recorderx.audioContext.sampleRate;
      const latestSampleRate = compressable ? this.sampleRate : actSampleRate;

      if (compressable) {
        buffer = compress(buffer, actSampleRate, this.sampleRate);
      }

      if (typeof encodeTo === 'function') {
        buffer = encodeTo(buffer, {
          sampleBits: this.sampleBits,
          sampleRate: this.sampleRate,
        });
      } else if (encodeTo === 'wav') {
        buffer = encodeWAV(buffer, this.sampleBits, latestSampleRate);
      }

      return buffer;
    }

    return null;
  }
}

environmentCheck();

export const audioTools = {
  merge,
  compress,
  encodeWAV,
};
export { RECORDER_STATE };
export default Recorderx;
