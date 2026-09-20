import { progressLayoutForWidth } from '../../constants/progressLayout';

describe('progress feature responsive layout', () => {
  it('preserves the three-column badge and two-column stat layout on phones', () => {
    expect(progressLayoutForWidth(390)).toEqual({
      contentMaxWidth: 640,
      badgeColumns: 3,
      statCardWidth: '47%',
    });
  });

  it('uses available tablet and desktop width without unbounded content', () => {
    expect(progressLayoutForWidth(768).badgeColumns).toBe(4);
    expect(progressLayoutForWidth(1199).contentMaxWidth).toBe(920);
    expect(progressLayoutForWidth(1200)).toEqual({
      contentMaxWidth: 1120,
      badgeColumns: 5,
      statCardWidth: '23.5%',
    });
  });
});
