/**
 * What jsdom does not give and the modules under test call.
 *
 * jsdom declares `scrollTo` but throws "not implemented" on every call, which
 * the router does on each navigation. A no-op keeps the output readable without
 * changing what is being tested.
 *
 * Testing Library appends each render to document.body, so without the cleanup
 * a second render in the same file queries both and counts the first one's rows.
 */

import { cleanup } from "@testing-library/svelte";
import { afterEach } from "vitest";

Object.defineProperty(globalThis, "scrollTo", {
  value: () => {},
  writable: true,
});

afterEach(cleanup);

/**
 * The Popover API, which jsdom does not implement.
 *
 * The picker puts its panel in the browser's top layer, so that a card clipping
 * to draw its corners cannot cut the list. jsdom has neither a top layer nor
 * `showPopover`, so without this stand-in the panel never opens and every
 * assertion about its contents fails for a reason that has nothing to do with
 * the contents. Where the panel actually lands is a question for the end to end
 * suite, which runs in a real browser.
 */
type Toggleable = HTMLElement & { _open?: boolean };

function toggleTo(element: Toggleable, open: boolean) {
  if (element._open === open) return;
  element._open = open;
  // jsdom carries the user-agent rule that hides a closed popover but cannot
  // match `:popover-open`, so the panel would stay out of the accessibility
  // tree however it is opened. This does what the real rule does.
  element.style.display = open ? "flex" : "none";
  const event = new Event("toggle") as Event & { newState: string };
  event.newState = open ? "open" : "closed";
  element.dispatchEvent(event);
}

// Through a widened reference: the DOM types say these exist, so narrowing on
// their absence leaves TypeScript with `never` to assign to.
const prototype = HTMLElement.prototype as unknown as {
  showPopover?: () => void;
  hidePopover?: () => void;
};

if (!prototype.showPopover) {
  prototype.showPopover = function showPopover(this: Toggleable) {
    toggleTo(this, true);
  };
  prototype.hidePopover = function hidePopover(this: Toggleable) {
    toggleTo(this, false);
  };
}
