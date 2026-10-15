// The Mirrorly mirror as a live mascot: <span class="mascot" data-face="wink"></span>
// Faces: wink (the icon), happy, oo, squint, frown, dark (glowing eyes only), smug.
(function () {
  const svg = `<svg viewBox="160 60 704 940" aria-hidden="true" focusable="false">
    <ellipse class="m-glow" cx="512" cy="426" rx="310" ry="360" fill="none" stroke="#fff4e0" stroke-width="80"/>
    <rect class="m-handle" x="482" y="740" width="70" height="245" rx="35" fill="#E68457" stroke="#EDAA8C" stroke-width="10"/>
    <ellipse class="m-frame" cx="512" cy="426" rx="294" ry="344" fill="#E68457" stroke="#EDAA8C" stroke-width="10"/>
    <ellipse class="m-rim" cx="508" cy="426" rx="222" ry="272" fill="#EDAA8C"/>
    <ellipse class="m-glass" cx="508" cy="426" rx="214" ry="264" fill="#CAF5F7"/>
    <g class="m-face" fill="none" stroke="#000" stroke-linecap="round">
      <path class="m-brow-l" d="M372 296 Q412 280 452 292" stroke-width="18"/>
      <path class="m-brow-r" d="M560 284 Q606 264 652 282" stroke-width="18"/>
      <rect class="m-eye-l" x="376" y="336" width="72" height="64" rx="32" fill="#000" stroke="none"/>
      <rect class="m-eye-r" x="578" y="320" width="72" height="64" rx="32" fill="#000" stroke="none"/>
      <path class="m-happy-l" d="M378 380 Q412 336 446 380" stroke-width="20"/>
      <path class="m-happy-r" d="M580 366 Q613 322 646 366" stroke-width="20"/>
      <path class="m-wink" d="M566 366 Q613 312 660 366" stroke-width="20"/>
      <path class="m-mouth" d="M425 572 Q545 600 636 505" stroke-width="22"/>
      <ellipse class="m-oo" cx="512" cy="550" rx="20" ry="30" fill="#000" stroke="none"/>
    </g>
  </svg>`;
  const mouths = {
    wink: "M425 572 Q545 600 636 505", smug: "M440 560 Q540 590 630 530", happy: "M420 520 Q528 640 636 520",
    squint: "M450 560 Q520 575 600 555", frown: "M440 590 Q520 540 600 590", dark: "M425 572 Q545 600 636 505", oo: "M0 0",
  };
  const set = (el, face) => {
    el.dataset.face = face;
    const s = el.querySelector("svg");
    s.querySelector(".m-mouth").setAttribute("d", mouths[face] || mouths.wink);
  };
  document.querySelectorAll(".mascot").forEach((el) => { el.innerHTML = svg; set(el, el.dataset.face || "wink"); });
  window.Mascot = { set: (el, face) => { if (el) set(el, face); } };
})();
