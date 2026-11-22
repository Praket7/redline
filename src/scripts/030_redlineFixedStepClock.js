
/* REDLINE v60 | fixed-step gameplay clock, independent from WebGL and the DOM.
   Core gameplay (including AI, replay capture and multiplayer state) advances
   only through the step callback. Rendering consumes alpha and never advances sim. */
(function(root, factory) {
  const module = factory();
  if (typeof module !== 'undefined' && typeof exports === 'object') {
    // Browser remains the primary target; Node test loads source in a VM.
  }
  root.REDLINE_FIXED_CLOCK = module;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';
  function create(options = {}) {
    const hz = Math.max(1, Number(options.hz) || 60);
    const fixedDt = 1 / hz;
    const maxSteps = Math.max(1, Math.floor(options.maxSteps || 4));
    let accumulator = 0;
    let ticks = 0;
    let dropped = 0;
    function reset() { accumulator = 0; }
    function advance(wallDelta, step) {
      const rawDelta = Math.max(0, Number(wallDelta) || 0);
      const delta = Math.min(rawDelta, fixedDt * maxSteps);
      dropped += Math.max(0, rawDelta - delta);
      accumulator += delta;
      let steps = 0;
      while (accumulator + 1e-10 >= fixedDt && steps < maxSteps) {
        step(fixedDt, ticks);
        accumulator -= fixedDt;
        ticks += 1;
        steps += 1;
      }
      if (accumulator >= fixedDt) {
        dropped += accumulator - accumulator % fixedDt;
        accumulator %= fixedDt;
      }
      return {steps, alpha: Math.max(0, Math.min(1, accumulator / fixedDt)), ticks};
    }
    return {
      fixedDt, hz, maxSteps, reset, advance,
      get ticks() { return ticks; },
      get alpha() { return Math.max(0, Math.min(1, accumulator / fixedDt)); },
      get droppedSeconds() { return dropped; }
    };
  }
  return Object.freeze({ create });
});
