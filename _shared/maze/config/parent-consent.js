/* maze-shim descriptor — parent-consent (Diana Cumberland, guardian).
   The simplest of the four: one linear flow, one choke point, no network config,
   no dev drawer. */
(function () {
  'use strict';

  MazeShim.init({
    proto: 'parent-consent',
    defaultScreen: 'inbox',
    screens: ['inbox', 'find-enrollment', 'consent', 'success'],
    wrap: ['showScreen'],

    observe: function () { return {}; },   // screen alone fully describes the state

    apply: function (p) {
      /* Always route through showScreen: initSigPad() measures the signature
         canvas with getBoundingClientRect and yields a 0x0 canvas (strokes land
         offset from the cursor) if the screen was not visible when it ran. */
      if (p.screen) window.showScreen(p.screen);
    }
  });
})();
