# Inter-School Speech Competition Timer

A responsive speech countdown timer for Quetta Residential School & College. The app includes a projector display and laptop controls, with the operator settings kept in a collapsible section.

## Features

- Countdown starts at **02:54**.
- Set a custom duration in minutes and seconds using **Apply**.
- Start, pause, and reset controls. Reset sets the display to **00:00**; pressing Start reloads the selected duration.
- Projector mode with fullscreen support and accessible timer controls.
- Six synthesized sound effects using the browser's Web Audio API.
- Optional student name announcement using the browser's speech synthesis.
- Collapsible settings with competition notes.
- Confetti celebration when time expires.
- Responsive layout for laptop and mobile screens.

## Run locally

1. Keep `index.html`, `style.css`, `script.js`, and `logo.png` in the same folder.
2. Open `index.html` in a modern browser, or serve the folder with a local web server.
3. Click **Start** once to allow the browser to play synthesized audio.

The confetti effect uses the `canvas-confetti` CDN and needs an internet connection. Timer controls work without it. Audio and speech announcements depend on browser support and permissions.

## Files

- `index.html` — page structure and controls.
- `style.css` — layout, responsive styles, and projector mode.
- `script.js` — countdown, audio, speech announcement, and control behavior.
- `logo.png` — school logo displayed in the header.
