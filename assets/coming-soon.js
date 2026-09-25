const video = document.querySelector('video');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
// Playback starts after a user gesture so browsers can play the film with sound.
motion.addEventListener('change', () => { if (motion.matches) video.pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
