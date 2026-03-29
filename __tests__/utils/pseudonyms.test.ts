import {
  generatePseudonym,
  ANONYMOUS_PHOTO_SENTINEL,
} from '../../utils/pseudonyms';

describe('ANONYMOUS_PHOTO_SENTINEL', () => {
  it('equals "__anonymous__"', () => {
    expect(ANONYMOUS_PHOTO_SENTINEL).toBe('__anonymous__');
  });
});

describe('generatePseudonym', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a string in "Word Word" format', () => {
    const name = generatePseudonym([]);
    expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it('returns a valid pseudonym with empty existing names', () => {
    const name = generatePseudonym([]);
    const parts = name.split(' ');
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it('returns deterministic result when Math.random is mocked', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const name = generatePseudonym([]);
    // With random = 0, floor(0 * length) = 0 so picks first adjective and first animal
    expect(name).toBe('Bold Badger');
  });

  it('avoids names in the existingNames list', () => {
    // Force first attempt to collide, then second attempt to succeed
    let callCount = 0;
    jest.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      // First 2 calls (adj + animal) return 0 -> "Bold Badger"
      // Next 2 calls return 1/length -> picks index 1 -> "Brave Bear"
      if (callCount <= 2) return 0;
      // Return a value that picks index 1
      return 1 / 100; // floor(1/100 * 90) = 0 for adj, but we need distinct...
    });

    // Reset and use a simpler approach
    jest.restoreAllMocks();

    // Mock to return 0 first (Bold Badger), then 0.01 (still Bold Badger area),
    // eventually something different
    const values = [
      0, 0,       // attempt 1: "Bold Badger" (blocked)
      0, 0,       // attempt 2: "Bold Badger" (blocked)
      0.02, 0.02, // attempt 3: picks index ~1 -> "Brave Bear"
    ];
    let idx = 0;
    jest.spyOn(Math, 'random').mockImplementation(() => {
      return values[idx++] ?? 0.5;
    });

    const name = generatePseudonym(['Bold Badger']);
    expect(name).not.toBe('Bold Badger');
    expect(name.split(' ')).toHaveLength(2);
  });

  it('appends a number as fallback after 20 failed attempts', () => {
    // Mock random to always return 0 -> "Bold Badger" for all 20 attempts
    // After 20 attempts, it falls through and appends a number
    const values: number[] = [];
    // 20 attempts * 2 calls each = 40 calls returning 0
    for (let i = 0; i < 40; i++) values.push(0);
    // Fallback: adj(0), animal(0), number random
    values.push(0, 0, 0.5);

    let idx = 0;
    jest.spyOn(Math, 'random').mockImplementation(() => {
      return values[idx++] ?? 0;
    });

    const name = generatePseudonym(['Bold Badger']);
    // Fallback format: "Adjective Animal N"
    expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ \d+$/);
  });

  it('returns unique names across multiple calls', () => {
    const names = new Set<string>();
    for (let i = 0; i < 50; i++) {
      names.add(generatePseudonym([]));
    }
    // With true randomness and 90*80=7200 combinations,
    // 50 calls should very likely be unique (though not guaranteed)
    // We just check we got a reasonable number of unique names
    expect(names.size).toBeGreaterThan(30);
  });

  it('handles a large existing names list', () => {
    // Even with many existing names, should still find a valid one
    const existing = Array.from({ length: 100 }, (_, i) => `Name${i} Animal${i}`);
    const name = generatePseudonym(existing);
    expect(name).toBeTruthy();
    expect(name.split(' ').length).toBeGreaterThanOrEqual(2);
  });
});
