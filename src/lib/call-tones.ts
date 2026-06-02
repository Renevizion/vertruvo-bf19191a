import * as Tone from "tone";

let synth: Tone.Synth | null = null;

async function getSynth() {
  await Tone.start();
  if (!synth) {
    synth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.2 },
    }).toDestination();
  }
  return synth;
}

async function play(notes: string[], duration = "8n") {
  const voice = await getSynth();
  const now = Tone.now();
  notes.forEach((note, index) => {
    voice.triggerAttackRelease(note, duration, now + index * 0.12);
  });
}

export const playConnectedTone = () => play(["C5", "E5"]);
export const playDisconnectedTone = () => play(["E4", "C4"]);
export const playSpeakingTone = () => play(["G4"], "16n");
