import { triggerLightFeedback } from '../../platform/feedback/index.web';

describe('web interaction feedback', () => {
  it('is a safe no-op', () => {
    expect(triggerLightFeedback()).toBeUndefined();
  });
});
