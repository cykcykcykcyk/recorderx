import Recorderx, { RECORDER_STATE } from '../src/index';

const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnStop = document.getElementById('btn-stop');
const dlog = document.getElementById('log');
const audio = document.getElementById('audio');
const audioReal = document.getElementById('audio-real');

function pushLog (log, error = '') {
  const xlog = `<span style="margin-right:8px">
           ${(new Date()).toLocaleString()}:
         </span>
         <span style="color:${error ? 'red' : 'blue'}">
           ${log} ${error}
         </span>`;
  const dl = document.createElement('div');
  dl.innerHTML = xlog;
  dlog.appendChild(dl);
}

let rc;

btnStart.addEventListener('click', () => {
  if (!rc) {
    rc = new Recorderx({
      recordable: true,
    });
  }
  if (rc.state === RECORDER_STATE.READY) {
    rc.start()
      .then((stream) => {
        audioReal.srcObject = stream;
        pushLog('start recording');
      })
      .catch((error) => {
        pushLog('Recording failed.', error);
      });
  }
});

btnPause.addEventListener('click', () => {
  if (rc && rc.state === RECORDER_STATE.RECORDING) {
    rc.pause();
    audio.src = URL.createObjectURL(rc.getRecord({
      encodeTo: 'wav',
    }));
    pushLog('pause recording');
  }
});

btnStop.addEventListener('click', () => {
  if (rc) {
    rc.close();
    rc = undefined;
    pushLog('stop recording and destroy Recorder');
  }
});
