import {
  MAX_WEB_IMAGE_BYTES,
  scheduleFilePickerCancellationCheck,
  validateWebImageFile,
} from '../../platform/mediaPicker/index.web';

describe('web media picker validation', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s images', type => {
    expect(() => validateWebImageFile({ type, size: 1024 })).not.toThrow();
  });

  it('rejects files that only look like images by extension', () => {
    expect(() => validateWebImageFile({ type: 'text/html', size: 1024 }))
      .toThrow('Choose a JPEG, PNG, or WebP image.');
  });

  it('rejects empty and oversized images before reading them', () => {
    expect(() => validateWebImageFile({ type: 'image/jpeg', size: 0 }))
      .toThrow('Choose an image smaller than 10 MB.');
    expect(() => validateWebImageFile({
      type: 'image/jpeg',
      size: MAX_WEB_IMAGE_BYTES + 1,
    })).toThrow('Choose an image smaller than 10 MB.');
  });

  it('settles cancellation after focus returns without a selected file', () => {
    const cancel = jest.fn();
    const schedule = jest.fn((callback: () => void) => callback());
    scheduleFilePickerCancellationCheck(() => false, cancel, schedule);
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 300);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('does not cancel when the chooser produced a file', () => {
    const cancel = jest.fn();
    scheduleFilePickerCancellationCheck(
      () => true,
      cancel,
      callback => callback()
    );
    expect(cancel).not.toHaveBeenCalled();
  });
});
