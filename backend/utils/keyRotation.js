/**
 * API Key Rotation Utility
 * Maintains a pool of API keys and rotates through them.
 * Skips keys that have failed and returns the first successful response.
 */

class KeyRotator {
  constructor(keys = []) {
    this.keys = keys.filter((k) => k && k.trim().length > 0);
    this.failedKeys = new Set();
  }

  getAvailableKeys() {
    return this.keys.filter((k) => !this.failedKeys.has(k));
  }

  markFailed(key) {
    this.failedKeys.add(key);
    // Reset after all keys have failed so we can try again
    if (this.failedKeys.size >= this.keys.length) {
      this.failedKeys.clear();
    }
  }

  /**
   * Try a request function against each available key until one succeeds.
   * @param {Function} requestFn - async function(apiKey) => response
   * @returns {Promise<any>} first successful result
   * @throws {Error} if all keys fail
   */
  async tryWithRotation(requestFn) {
    const available = this.getAvailableKeys();

    if (available.length === 0) {
      throw new Error("No API keys available");
    }

    let lastError = null;

    for (const key of available) {
      try {
        const result = await requestFn(key);
        return result;
      } catch (err) {
        console.warn(
          `Key ${key.slice(0, 8)}... failed: ${err.message}`
        );
        this.markFailed(key);
        lastError = err;
      }
    }

    throw lastError || new Error("All API keys exhausted");
  }
}

module.exports = { KeyRotator };
