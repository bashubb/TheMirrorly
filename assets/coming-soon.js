const video = document.querySelector('video');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
// Native controls remain available with or without JavaScript.
// Start silently for users without a reduced-motion preference.
if (!motion.matches) video.play().catch(() => {});
motion.addEventListener('change', () => { if (motion.matches) video.pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
