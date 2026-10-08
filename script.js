const DEFAULT_DURATION_SECONDS = 2 * 60 + 54;

const timerDisplay = document.querySelector("#timer");
const timerCaption = document.querySelector("#timer-caption");
const timerProgress = document.querySelector("#timer-progress-fill");
const projectorPanel = document.querySelector(".projector-panel");
const projectorState = document.querySelector("#projector-state");
const operatorStatus = document.querySelector("#operator-status");
const startButton = document.querySelector("#start-button");
const startLabel = document.querySelector("#start-label");
const pauseButton = document.querySelector("#pause-button");
const resetButton = document.querySelector("#reset-button");
const durationForm = document.querySelector("#duration-form");
const durationMinutesInput = document.querySelector("#duration-minutes");
const durationSecondsInput = document.querySelector("#duration-seconds");
const durationError = document.querySelector("#duration-error");
const soundSelect = document.querySelector("#sound-select");
const introToggle = document.querySelector("#intro-toggle");
const studentNameInput = document.querySelector("#student-name");
const speakerBanner = document.querySelector("#speaker-banner");
const bannerMessage = document.querySelector("#banner-message");
const burstOverlay = document.querySelector("#burst-overlay");
const projectorButton = document.querySelector("#projector-button");
const projectorButtonLabel = document.querySelector("#projector-button-label");
const schoolLogo = document.querySelector(".school-logo");

const SOUND_PRESETS = {
  techno: [
    { frequency: 660, duration: 0.11, wave: "square" },
    { frequency: 880, duration: 0.16, wave: "square", delay: 0.12 },
  ],
  arcade: [
    { frequency: 523.25, duration: 0.11, wave: "triangle" },
    { frequency: 659.25, duration: 0.11, wave: "triangle", delay: 0.1 },
    { frequency: 783.99, duration: 0.2, wave: "triangle", delay: 0.2 },
  ],
  cinematic: [
    { frequency: 110, endFrequency: 73.42, duration: 0.55, wave: "sawtooth", volume: 0.16 },
    { frequency: 440, duration: 0.2, wave: "sine", delay: 0.32, volume: 0.12 },
  ],
  bell: [
    { frequency: 880, duration: 0.5, wave: "sine", volume: 0.16 },
    { frequency: 1318.51, duration: 0.35, wave: "sine", delay: 0.08, volume: 0.12 },
  ],
  digital: [
    { frequency: 1046.5, duration: 0.09, wave: "sine", volume: 0.15 },
    { frequency: 1396.91, duration: 0.12, wave: "sine", delay: 0.13, volume: 0.15 },
    { frequency: 1760, duration: 0.22, wave: "sine", delay: 0.29, volume: 0.12 },
  ],
  classic: [
    { frequency: 740, duration: 0.18, wave: "triangle", volume: 0.16 },
    { frequency: 587.33, duration: 0.25, wave: "triangle", delay: 0.22, volume: 0.16 },
  ],
};

let configuredDuration = DEFAULT_DURATION_SECONDS * 1000;
let remainingMilliseconds = configuredDuration;
let deadline = 0;
let intervalId = null;
let mode = "ready";
let speechToken = 0;
let audioContext = null;
let introCompleted = false;

function setStatus(message) {
  operatorStatus.textContent = message;
}

function formatTime(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(remainingMilliseconds);
  const progress = configuredDuration > 0
    ? Math.max(0, Math.min(1, remainingMilliseconds / configuredDuration))
    : 0;

  timerProgress.style.transform = `scaleX(${progress})`;
  projectorPanel.classList.toggle("is-warning", remainingMilliseconds > 0 && remainingMilliseconds <= 10_000);
  projectorPanel.classList.toggle("is-finished", remainingMilliseconds === 0 && mode === "finished");
}

function renderMode() {
  const isActive = mode === "running" || mode === "announcing";
  startButton.disabled = isActive;
  pauseButton.disabled = !isActive;
  startLabel.textContent = mode === "paused" ? "Resume" : "Start";

  const labels = {
    ready: "Ready",
    running: "In progress",
    announcing: "Introducing",
    paused: "Paused",
    finished: "Time is up",
  };
  projectorState.textContent = labels[mode];

  if (mode !== "announcing") {
    speakerBanner.hidden = true;
  }

  renderTimer();
}

function cancelSpeech() {
  speechToken += 1;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function stopCountdown() {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
}

function playSelectedSound() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    setStatus("Web Audio is not supported by this browser.");
    return;
  }

  try {
    if (audioContext === null) {
      audioContext = new AudioContextConstructor();
    }
    const context = audioContext;
    const playNotes = () => {
      const now = context.currentTime;
      const notes = SOUND_PRESETS[soundSelect.value] || SOUND_PRESETS.techno;

      for (const note of notes) {
        const startAt = now + (note.delay || 0);
        const endAt = startAt + note.duration;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const attack = Math.min(0.025, note.duration / 4);

        oscillator.type = note.wave;
        oscillator.frequency.setValueAtTime(note.frequency, startAt);
        if (note.endFrequency) {
          oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency, endAt);
        }

        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(note.volume || 0.13, startAt + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(endAt + 0.02);
      }
    };

    if (context.state === "suspended") {
      context.resume().then(playNotes).catch((error) => {
        console.error("Unable to resume the audio context.", error);
        setStatus("Audio could not start. Check browser audio permissions.");
      });
    } else {
      playNotes();
    }
  } catch (error) {
    console.error("Unable to play the selected sound effect.", error);
    setStatus("Audio could not start. Check browser audio permissions.");
  }
}

function playStartBurst() {
  burstOverlay.classList.remove("is-active");
  void burstOverlay.offsetWidth;
  burstOverlay.classList.add("is-active");
  window.setTimeout(() => burstOverlay.classList.remove("is-active"), 1100);
}

function startCountdown() {
  if (intervalId !== null || remainingMilliseconds <= 0) {
    return;
  }

  mode = "running";
  deadline = Date.now() + remainingMilliseconds;
  timerCaption.textContent = "Speech in progress";
  setStatus("Speech timer running.");
  renderMode();
  tick();
  if (mode === "running") {
    intervalId = window.setInterval(tick, 100);
  }
}

function announceStudent(name) {
  if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") {
    setStatus("Speech synthesis is unavailable; timer started without an announcement.");
    introCompleted = true;
    startCountdown();
    return;
  }

  const token = ++speechToken;
  const utterance = new SpeechSynthesisUtterance(`${name}. Good Luck.`);
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.onend = () => {
    if (token !== speechToken || mode !== "announcing") {
      return;
    }
    introCompleted = true;
    speakerBanner.hidden = true;
    startCountdown();
  };
  utterance.onerror = (event) => {
    if (token !== speechToken || mode !== "announcing") {
      return;
    }
    mode = "ready";
    timerCaption.textContent = "Announcement could not be completed";
    renderMode();
    setStatus(`Voice announcement failed (${event.error || "unknown error"}). Press Start to try again.`);
  };

  mode = "announcing";
  timerCaption.textContent = `Good luck, ${name}!`;
  bannerMessage.textContent = `${name} - Good Luck!`;
  speakerBanner.hidden = false;
  setStatus(`Introducing ${name}. Timer starts when the announcement finishes.`);
  renderMode();

  try {
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error("Unable to start the student voice announcement.", error);
    mode = "ready";
    timerCaption.textContent = "Announcement could not be started";
    renderMode();
    setStatus("Voice announcement could not start. Press Start to try again.");
  }
}

function restoreSelectedDurationIfEmpty() {
  if (remainingMilliseconds > 0) {
    return;
  }

  remainingMilliseconds = configuredDuration;
  mode = "ready";
  timerCaption.textContent = "Ready when you are";
  renderMode();
}

function handleStart() {
  if (mode === "running" || mode === "announcing") {
    return;
  }

  if (mode === "paused") {
    if (!introCompleted && introToggle.checked) {
      const studentName = studentNameInput.value.trim();
      if (!studentName) {
        studentNameInput.focus();
        setStatus("Enter the next speaker's name or turn off Student intro.");
        return;
      }
      playSelectedSound();
      playStartBurst();
      announceStudent(studentName);
    } else {
      playSelectedSound();
      playStartBurst();
      startCountdown();
    }
    return;
  }

  if (introToggle.checked) {
    const studentName = studentNameInput.value.trim();
    if (!studentName) {
      studentNameInput.focus();
      setStatus("Enter the next speaker's name or turn off Student intro.");
      return;
    }
    restoreSelectedDurationIfEmpty();
    playSelectedSound();
    playStartBurst();
    introCompleted = false;
    announceStudent(studentName);
  } else {
    restoreSelectedDurationIfEmpty();
    playSelectedSound();
    playStartBurst();
    introCompleted = true;
    startCountdown();
  }
}

function handlePause() {
  if (mode !== "running" && mode !== "announcing") {
    return;
  }

  playSelectedSound();
  if (mode === "announcing") {
    cancelSpeech();
    mode = "paused";
    timerCaption.textContent = "Announcement paused";
    setStatus("Announcement stopped. Press Resume to continue.");
  } else {
    remainingMilliseconds = Math.max(0, deadline - Date.now());
    stopCountdown();
    if (remainingMilliseconds === 0) {
      finishCountdown();
      return;
    }
    mode = "paused";
    timerCaption.textContent = "Timer paused";
    setStatus("Speech timer paused.");
  }

  renderMode();
}

function celebrateEnd() {
  if (typeof window.confetti !== "function") {
    console.error("canvas-confetti did not load.");
    setStatus("Speech time is up. Confetti is unavailable; check your internet connection.");
    return;
  }

  const options = {
    spread: 360,
    startVelocity: 46,
    ticks: 75,
    gravity: 0.85,
    scalar: 1.05,
    zIndex: 20,
    colors: ["#52d7a3", "#f3c969", "#f58b67", "#ffffff", "#74b9ff"],
  };

  window.confetti({ ...options, particleCount: 100, origin: { x: 0.5, y: 0.62 } });
  window.setTimeout(() => {
    window.confetti({ ...options, particleCount: 65, origin: { x: 0.18, y: 0.72 } });
    window.confetti({ ...options, particleCount: 65, origin: { x: 0.82, y: 0.72 } });
  }, 220);
  window.setTimeout(() => {
    window.confetti({ ...options, particleCount: 55, origin: { x: 0.5, y: 0.48 } });
  }, 480);
}

function finishCountdown() {
  stopCountdown();
  remainingMilliseconds = 0;
  mode = "finished";
  timerCaption.textContent = "Time is up";
  renderMode();
  setStatus("Speech time is up.");
  celebrateEnd();
}

function tick() {
  remainingMilliseconds = Math.max(0, deadline - Date.now());
  renderTimer();
  if (remainingMilliseconds === 0) {
    finishCountdown();
  }
}

function handleReset() {
  stopCountdown();
  cancelSpeech();
  introCompleted = false;
  remainingMilliseconds = 0;
  mode = "ready";
  timerCaption.textContent = "Timer reset";
  renderMode();
  setStatus("Timer reset to 00:00. Press Start to restart the selected duration.");
}

function applyDuration(event) {
  event.preventDefault();
  durationError.hidden = true;

  const minutesValue = durationMinutesInput.value;
  const secondsValue = durationSecondsInput.value;
  const minutes = Number(minutesValue);
  const seconds = Number(secondsValue);
  const minutesValid = minutesValue !== "" && Number.isInteger(minutes) && minutes >= 0 && minutes <= 99;
  const secondsValid = secondsValue !== "" && Number.isInteger(seconds) && seconds >= 0 && seconds <= 59;

  if (!minutesValid || !secondsValid) {
    durationError.textContent = "Enter 0–99 minutes and 0–59 seconds.";
    durationError.hidden = false;
    (minutesValid ? durationSecondsInput : durationMinutesInput).focus();
    return;
  }

  const durationSeconds = minutes * 60 + seconds;
  if (durationSeconds === 0) {
    durationError.textContent = "Duration must be at least one second.";
    durationError.hidden = false;
    durationSecondsInput.focus();
    return;
  }

  stopCountdown();
  cancelSpeech();
  introCompleted = false;
  configuredDuration = durationSeconds * 1000;
  remainingMilliseconds = configuredDuration;
  mode = "ready";
  timerCaption.textContent = "Ready when you are";
  renderMode();
  setStatus(`Time limit set to ${formatTime(remainingMilliseconds)}.`);
}

async function toggleProjectorMode() {
  const entering = !document.body.classList.contains("projector-mode");
  document.body.classList.toggle("projector-mode", entering);

  try {
    if (entering && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    } else if (!entering && document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  } catch (error) {
    console.error("Unable to change browser fullscreen mode.", error);
    setStatus("Projector layout changed, but fullscreen was blocked by the browser.");
  }

  updateProjectorMode();
}

function updateProjectorMode() {
  const isProjectorMode = document.body.classList.contains("projector-mode");
  projectorButtonLabel.textContent = isProjectorMode ? "Exit projector mode" : "Enter projector mode";
  projectorButton.setAttribute("aria-pressed", String(isProjectorMode));
}

function handleFullscreenChange() {
  if (!document.fullscreenElement) {
    document.body.classList.remove("projector-mode");
  }
  updateProjectorMode();
}

startButton.addEventListener("click", handleStart);
pauseButton.addEventListener("click", handlePause);
resetButton.addEventListener("click", handleReset);
durationForm.addEventListener("submit", applyDuration);
introToggle.addEventListener("change", () => {
  studentNameInput.disabled = !introToggle.checked;
});
projectorButton.addEventListener("click", toggleProjectorMode);
document.addEventListener("fullscreenchange", handleFullscreenChange);

schoolLogo.addEventListener("error", () => {
  schoolLogo.hidden = true;
});

renderMode();
updateProjectorMode();
