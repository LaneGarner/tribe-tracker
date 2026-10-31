import { getInitials } from '../../utils/avatarInitials';

it('handles blank names without crashing Profile or Home', () => {
  expect(getInitials('   ', 'lane@example.com')).toBe('L');
  expect(getInitials('   ')).toBe('?');
  expect(getInitials('')).toBe('?');
});
it('uses initials from trimmed names', () => {
  expect(getInitials('  Lane Garner ')).toBe('LG');
  expect(getInitials('Lane')).toBe('L');
});
