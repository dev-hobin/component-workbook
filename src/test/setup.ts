import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Polyfill for Web Animations API (not supported in jsdom)
if (typeof Element.prototype.getAnimations !== 'function') {
  Element.prototype.getAnimations = function () {
    return []
  }
}
