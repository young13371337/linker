Place your notification sound file here as `notification.mp3` (or `.wav`).

The app will try `/sounds/notification.mp3` first, then `/sound/notification.mp3` as a fallback. If neither exists the client will synthesize a short beep using the WebAudio API.

Recommended file: `public/sounds/notification.mp3` (short, ~200ms, volume-normalized).