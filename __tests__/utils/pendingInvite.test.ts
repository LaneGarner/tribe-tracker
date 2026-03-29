import {
  setPendingInviteCode,
  consumePendingInviteCode,
  setPendingChallengeId,
  consumePendingChallengeId,
} from '../../utils/pendingInvite';

describe('pendingInvite', () => {
  // Clear module-level state before each test to ensure isolation.
  // Since these are module-level variables, we consume any leftover values.
  beforeEach(() => {
    consumePendingInviteCode();
    consumePendingChallengeId();
  });

  describe('setPendingInviteCode / consumePendingInviteCode', () => {
    it('returns null when no code has been set', () => {
      expect(consumePendingInviteCode()).toBeNull();
    });

    it('returns the code after setting it', () => {
      setPendingInviteCode('ABC123');
      expect(consumePendingInviteCode()).toBe('ABC123');
    });

    it('returns null on second consume (single-use)', () => {
      setPendingInviteCode('XYZ');
      consumePendingInviteCode();
      expect(consumePendingInviteCode()).toBeNull();
    });

    it('overwrites a previously set code', () => {
      setPendingInviteCode('FIRST');
      setPendingInviteCode('SECOND');
      expect(consumePendingInviteCode()).toBe('SECOND');
    });

    it('does not affect pending challenge id', () => {
      setPendingInviteCode('CODE');
      setPendingChallengeId('ID');
      consumePendingInviteCode();
      expect(consumePendingChallengeId()).toBe('ID');
    });
  });

  describe('setPendingChallengeId / consumePendingChallengeId', () => {
    it('returns null when no id has been set', () => {
      expect(consumePendingChallengeId()).toBeNull();
    });

    it('returns the id after setting it', () => {
      setPendingChallengeId('challenge-42');
      expect(consumePendingChallengeId()).toBe('challenge-42');
    });

    it('returns null on second consume (single-use)', () => {
      setPendingChallengeId('challenge-42');
      consumePendingChallengeId();
      expect(consumePendingChallengeId()).toBeNull();
    });

    it('overwrites a previously set id', () => {
      setPendingChallengeId('old-id');
      setPendingChallengeId('new-id');
      expect(consumePendingChallengeId()).toBe('new-id');
    });

    it('does not affect pending invite code', () => {
      setPendingChallengeId('ID');
      setPendingInviteCode('CODE');
      consumePendingChallengeId();
      expect(consumePendingInviteCode()).toBe('CODE');
    });
  });

  describe('cross-feature isolation', () => {
    it('setting and consuming one does not affect the other', () => {
      setPendingInviteCode('invite-code');
      setPendingChallengeId('challenge-id');

      expect(consumePendingInviteCode()).toBe('invite-code');
      expect(consumePendingChallengeId()).toBe('challenge-id');

      // Both consumed
      expect(consumePendingInviteCode()).toBeNull();
      expect(consumePendingChallengeId()).toBeNull();
    });

    it('multiple set-consume cycles work correctly', () => {
      setPendingInviteCode('a');
      expect(consumePendingInviteCode()).toBe('a');
      expect(consumePendingInviteCode()).toBeNull();

      setPendingInviteCode('b');
      expect(consumePendingInviteCode()).toBe('b');

      setPendingChallengeId('x');
      setPendingChallengeId('y');
      expect(consumePendingChallengeId()).toBe('y');
      expect(consumePendingChallengeId()).toBeNull();
    });
  });
});
