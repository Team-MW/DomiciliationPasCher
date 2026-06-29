// src/utils/updateMutex.js
let pending = false;

/**
 * Acquire a simple in‑process lock.
 * Returns true if the lock was obtained, false otherwise.
 */
export const acquireLock = () => {
  if (pending) return false;
  pending = true;
  return true;
};

/** Release the lock. */
export const releaseLock = () => {
  pending = false;
};
