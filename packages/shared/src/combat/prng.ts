export interface RandomSource {
  nextFloat(): number;
  nextInt(minInclusive: number, maxInclusive: number): number;
}

export class Mulberry32 implements RandomSource {
  private state: number;

  public constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  public nextInt(minInclusive: number, maxInclusive: number): number {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive)) {
      throw new TypeError("Random integer bounds must be integers.");
    }
    if (maxInclusive < minInclusive) {
      throw new RangeError("maxInclusive must be greater than or equal to minInclusive.");
    }

    return Math.floor(this.nextFloat() * (maxInclusive - minInclusive + 1)) + minInclusive;
  }
}
