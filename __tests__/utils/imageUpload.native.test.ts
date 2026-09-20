jest.mock('../../lib/supabase', () => ({
  supabase: { storage: { from: jest.fn() } },
}));

import { uploadAvatar } from '../../utils/imageUpload';
import { supabase } from '../../lib/supabase';

const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn(() => ({ data: { publicUrl: 'https://storage/avatar.jpg' } }));
const mockFrom = supabase.storage.from as jest.Mock;

describe('native image upload characterization', () => {
  beforeEach(() => {
    mockUpload.mockReset().mockResolvedValue({ error: null });
    mockFrom.mockReset().mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
      remove: jest.fn(),
    });
  });

  it('preserves the original direct ArrayBuffer and JPEG upload contract', async () => {
    const bytes = new ArrayBuffer(4);
    const blob = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: jest.fn().mockResolvedValue(bytes),
      blob,
    });

    await expect(uploadAvatar('user-1', 'file:///avatar.jpg')).resolves.toMatch(
      /^https:\/\/storage\/avatar\.jpg\?t=/
    );
    expect(blob).not.toHaveBeenCalled();
    expect(mockUpload).toHaveBeenCalledWith('user-1/avatar.jpg', bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  });
});
