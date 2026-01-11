/**
 * Creates a throttled function that only invokes the provided function
 * at most once per specified interval.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T> | undefined;

  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
    if (!inThrottle) {
      lastResult = func.apply(this, args) as ReturnType<T>;
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    return lastResult;
  };
}

/**
 * Creates a debounced function that delays invoking func until after
 * wait milliseconds have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (this: unknown, ...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

/**
 * Rate limiter that tracks operation counts within a time window.
 */
export class RateLimiter {
  private operations: number[] = [];
  private readonly maxOperations: number;
  private readonly windowMs: number;

  constructor(maxOperations: number, windowMs: number) {
    this.maxOperations = maxOperations;
    this.windowMs = windowMs;
  }

  /**
   * Check if an operation is allowed under the rate limit.
   * Returns true if allowed, false if rate limited.
   */
  canProceed(): boolean {
    const now = Date.now();
    
    // Remove operations outside the window
    this.operations = this.operations.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    return this.operations.length < this.maxOperations;
  }

  /**
   * Record an operation. Call this after successfully completing an operation.
   */
  recordOperation(): void {
    this.operations.push(Date.now());
  }

  /**
   * Get remaining operations allowed in the current window.
   */
  getRemainingOperations(): number {
    const now = Date.now();
    this.operations = this.operations.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    return Math.max(0, this.maxOperations - this.operations.length);
  }
}
