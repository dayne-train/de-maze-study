/* scripts/app/workspace.js — Workspace (starting screen) behaviour.
   Two jobs, both driven by the Figma workspace frame (16719:154698):

   1. "Starting Screen" menu — the counselor picks which WorkspaceCards appear on
      their landing screen. Each row is a Tasty checkbox inside the canonical
      .tasty-menu; the row's own click handler stops propagation so the kit's
      document listener doesn't close the menu on every toggle.
   2. Row-start borders — cards are separated by LEFT borders, and the card that
      begins each visual row must not have one. With a wrapping flex row that
      can't be expressed in CSS alone, so we tag the first card of each row.
   Load order is fixed in index.html; do not reorder casually. */

  function wsCards() {
    return Array.prototype.slice.call(document.querySelectorAll('.workspace-cards .workspace-card'));
  }

  /* Is this card actually laid out? A card can be hidden by the user's Starting
     Screen preference (.is-hidden) OR by the exchange config (.is-unavailable), and
     row-start tagging has to ignore it either way. offsetParent is the honest test:
     it's null for anything display:none, whatever put it there. */
  function wsCardShown(card) { return card.offsetParent !== null; }

  /* Tag the first VISIBLE card of each visual row so it drops its left border.
     No-op while the workspace screen is hidden — offsetTop is 0 for every card
     then, which would flag them all. */
  function wsMarkRowStarts() {
    var wrap = document.querySelector('.workspace-cards');
    if (!wrap || !wrap.offsetParent) return;
    var top = null;
    wsCards().forEach(function (card) {
      card.classList.remove('is-row-start');
      // A hidden card has offsetTop 0, which would otherwise poison `top` and stop
      // the real cards after it from being recognised as starting a new row.
      if (!wsCardShown(card)) return;
      var t = card.offsetTop;
      if (top === null || t > top + 4) { card.classList.add('is-row-start'); top = t; }
    });
  }

  /* Config-driven availability. Kept separate from the user's preference so the two
     can't overwrite each other: turning a capability off hides its card, turning it
     back on restores whatever the user had chosen. Syncs the Starting Screen menu
     row (an unavailable capability isn't a choice the user can make) and re-measures
     the row borders, which is the step the old inline-display approach skipped. */
  function wsSetCardAvailable(cardId, available) {
    var card = document.getElementById(cardId);
    if (!card) return;
    card.classList.toggle('is-unavailable', !available);
    var row = document.querySelector('.ws-starting-opt[data-ws-card="' + cardId + '"]');
    if (row) {
      row.classList.toggle('is-disabled', !available);
      row.setAttribute('aria-disabled', String(!available));
    }
    wsMarkRowStarts();
  }
  window.wsSetCardAvailable = wsSetCardAvailable;
  window.wsMarkRowStarts = wsMarkRowStarts;

  /* Show/hide one card from the Starting Screen menu. Never lets the counselor
     empty the workspace entirely — the last remaining card stays put. */
  window.toggleWorkspaceCard = function (cardId, row) {
    var card = document.getElementById(cardId);
    if (!card) return;
    // Not a choice the user gets to make: the network doesn't offer this capability.
    if (card.classList.contains('is-unavailable')) return;
    var hiding = !card.classList.contains('is-hidden');
    // Count only cards the config actually offers, so the "keep one" guard can't be
    // satisfied by a card that the exchange config is hiding anyway.
    var shown = wsCards().filter(function (c) {
      return !c.classList.contains('is-hidden') && !c.classList.contains('is-unavailable');
    });
    if (hiding && shown.length <= 1) {
      showToast('Keep at least one card on your starting screen.', 'config');
      return;
    }
    card.classList.toggle('is-hidden', hiding);
    if (row) {
      var box = row.querySelector('.tasty-checkbox');
      if (box) {
        box.classList.toggle('is-checked', !hiding);
        box.querySelector('.tasty-checkbox__box').innerHTML = hiding ? '' : '<i class="ti ti-check"></i>';
      }
      row.setAttribute('aria-selected', String(!hiding));
    }
    wsMarkRowStarts();
  };

  document.addEventListener('DOMContentLoaded', function () {
    wsMarkRowStarts();
    /* Re-measure whenever the workspace screen comes back into view. */
    if (typeof window.showScreen === 'function' && !window.showScreen.__wsWrapped) {
      var orig = window.showScreen;
      window.showScreen = function () {
        var r = orig.apply(this, arguments);
        wsMarkRowStarts();
        return r;
      };
      window.showScreen.__wsWrapped = true;
    }
  });
  window.addEventListener('resize', wsMarkRowStarts);
  window.addEventListener('load', wsMarkRowStarts);
