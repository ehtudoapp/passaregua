/**
 * Generates a RFC 4122 compliant v4 UUID
 * Uses crypto.randomUUID() when available, falls back to crypto.getRandomValues()
 * or Math.random() as a last resort
 */
export function generateUUID(): string {
  // Try modern crypto.randomUUID() first (most browsers and Node.js 16+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback to crypto.getRandomValues() for older environments
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    
    // Set version (4) and variant bits according to RFC 4122
    // Version 4: bits 12-15 of time_hi_and_version field = 0100
    const VERSION_4_MASK = 0x0f; // Clear version bits
    const VERSION_4_VALUE = 0x40; // Set version to 4
    bytes[6] = (bytes[6] & VERSION_4_MASK) | VERSION_4_VALUE;
    
    // Variant: bits 6-7 of clock_seq_hi_and_reserved field = 10
    const VARIANT_MASK = 0x3f; // Clear variant bits
    const VARIANT_VALUE = 0x80; // Set variant to 10
    bytes[8] = (bytes[8] & VARIANT_MASK) | VARIANT_VALUE;

    // Convert bytes to UUID string format
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  // Last resort fallback using Math.random() (not cryptographically secure)
  // This should only be used in very old environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
