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
