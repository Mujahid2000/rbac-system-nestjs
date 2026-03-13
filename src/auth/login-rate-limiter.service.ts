import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface AttemptBucket {
  count: number;
  windowStartMs: number;
}

@Injectable()
export class LoginRateLimiterService {
  private readonly buckets = new Map<string, AttemptBucket>();
  private readonly limit = 5;
  private readonly windowMs = 60_000;

  assertAllowed(key: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStartMs >= this.windowMs) {
      this.buckets.set(key, { count: 0, windowStartMs: now });
      return;
    }

    if (bucket.count >= this.limit) {
      throw new HttpException(
        'Too many login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  registerFailure(key: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStartMs >= this.windowMs) {
      this.buckets.set(key, { count: 1, windowStartMs: now });
      return;
    }

    bucket.count += 1;
    this.buckets.set(key, bucket);
  }

  registerSuccess(key: string): void {
    this.buckets.delete(key);
  }
}
