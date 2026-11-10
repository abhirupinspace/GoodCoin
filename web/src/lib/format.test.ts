import { describe, expect, it } from "vitest";
import {
  decimalToUnits,
  formatCountdown,
  formatDurationNs,
  formatGood,
  formatInt,
  formatTimestampNs,
  rewardForStreak,
  unitsToDecimal,
} from "./format";

const GOOD = 10n ** 24n;

describe("yocto-GOOD formatting (BigInt, 24 decimals)", () => {
  it("formats whole and fractional amounts without precision loss", () => {
    expect(formatGood((25n * GOOD).toString())).toBe("25");
    expect(formatGood("28125000000000000000000000")).toBe("28.125");
    expect(formatGood((250_000_000n * GOOD).toString())).toBe("250,000,000");
    // beyond Number precision: 1e33 + 1 yocto
    expect(unitsToDecimal(10n ** 33n + 1n, 24)).toBe("1000000000.000000000000000000000001");
  });

  it("abbreviates in compact mode, rounding down", () => {
    expect(formatGood((1_000_000_000n * GOOD).toString(), { compact: true })).toBe("1B");
    expect(formatGood((249_750_000n * GOOD).toString(), { compact: true })).toBe("249.75M");
    expect(formatGood((1_999n * GOOD).toString(), { compact: true })).toBe("1.99K");
    expect(formatGood((999n * GOOD).toString(), { compact: true })).toBe("999");
  });

  it("handles zero, dust and invalid input", () => {
    expect(formatGood("0")).toBe("0");
    expect(formatGood("1")).toBe("<0.0001");
    expect(formatGood(undefined)).toBe("--");
    expect(formatGood("not-a-number")).toBe("--");
    expect(formatGood("1.5")).toBe("--");
  });

  it("parses user input to yocto exactly", () => {
    expect(decimalToUnits("12.5", 24)).toBe(12_500_000_000_000_000_000_000_000n);
    expect(decimalToUnits("0.000000000000000000000001", 24)).toBe(1n);
    expect(decimalToUnits("1.0000000000000000000000001", 24)).toBeNull();
    expect(decimalToUnits("-1", 24)).toBeNull();
    expect(decimalToUnits("", 24)).toBeNull();
  });

  it("formats integers with separators", () => {
    expect(formatInt("1234567")).toBe("1,234,567");
    expect(formatInt(Number.NaN)).toBe("--");
  });
});

describe("nanosecond durations and timestamps", () => {
  it("renders the two largest units", () => {
    expect(formatDurationNs("360000000000")).toBe("6m"); // demo epoch
    expect(formatDurationNs("604800000000000")).toBe("7d"); // production epoch
    expect(formatDurationNs("120000000000")).toBe("2m");
    expect(formatDurationNs("90061000000000")).toBe("1d 1h");
    expect(formatDurationNs("15724800000000000")).toBe("182d");
    expect(formatDurationNs("0")).toBe("0s");
    expect(formatDurationNs("500")).toBe("<1s");
  });

  it("formats countdowns and UTC timestamps", () => {
    expect(formatCountdown(65_000)).toBe("01m 05s");
    expect(formatCountdown(3_725_000)).toBe("1h 02m 05s");
    expect(formatCountdown(-1)).toBe("0s");
    expect(formatTimestampNs("1794341157153559246")).toBe("2026-11-10 20:05 UTC");
  });
});

describe("streak reward (mirrors contract reward_for_streak)", () => {
  const base = 25n * GOOD;
  it("adds 12.5% per streak step, capped at 8", () => {
    expect(rewardForStreak(base, 0, 1250, 8)).toBe(base);
    expect(rewardForStreak(base, 1, 1250, 8)).toBe(28_125_000_000_000_000_000_000_000n);
    expect(rewardForStreak(base, 8, 1250, 8)).toBe(50n * GOOD);
    expect(rewardForStreak(base, 20, 1250, 8)).toBe(50n * GOOD);
  });
});
