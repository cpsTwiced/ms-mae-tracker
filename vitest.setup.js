import '@testing-library/jest-dom/vitest'
import { webcrypto } from 'node:crypto'

// Guarantee crypto.randomUUID() exists under jsdom.
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  })
}

// Mantine relies on these browser APIs that jsdom doesn't implement.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver
