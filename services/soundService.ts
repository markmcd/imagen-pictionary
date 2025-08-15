
import * as Tone from 'tone';

let correctSynth: Tone.Synth;
let gameOverSynth: Tone.Synth;
let wrongGuessSynth: Tone.FMSynth;
let isInitialized = false;

const initializeSynths = () => {
  if (isInitialized) return;
  
  correctSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 }
  }).toDestination();
  
  gameOverSynth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 1 }
  }).toDestination();
  
  wrongGuessSynth = new Tone.FMSynth({
    harmonicity: 8,
    modulationIndex: 2,
    envelope: { attack: 0.01, decay: 0.2 },
    modulationEnvelope: { attack: 0.01, decay: 0.1 }
  }).toDestination();
  
  isInitialized = true;
};

export const initAudio = async () => {
  if (Tone.context.state !== 'running') {
    await Tone.start();
    console.log('Audio context started');
  }
  initializeSynths();
};

export const playCorrectSound = () => {
  if (!isInitialized) return;
  const now = Tone.now();
  correctSynth.triggerAttackRelease('C5', '8n', now);
  correctSynth.triggerAttackRelease('G5', '8n', now + 0.1);
};

export const playDrawingReadySound = () => {
  if (!isInitialized) return;
  // Play the first note of the "correct" sound, but shorter.
  correctSynth.triggerAttackRelease('C5', '16n', Tone.now());
};

export const playGameOverSound = () => {
  if (!isInitialized) return;
  const now = Tone.now();
  // Descending two-note melody, an octave lower than the win sound.
  gameOverSynth.triggerAttackRelease('G4', '8n', now);
  gameOverSynth.triggerAttackRelease('C4', '8n', now + 0.1);
};

export const playWrongGuessSound = () => {
  if (!isInitialized) return;
  wrongGuessSynth.triggerAttackRelease('C2', '8n', Tone.now());
};
