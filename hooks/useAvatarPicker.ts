import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { updateProfile } from '../redux/slices/profileSlice';
import { useAuth } from '../context/AuthContext';
import { pickImage, uploadAvatar, deleteAvatar } from '../utils/imageUpload';
import { showAlert } from '../platform/dialogs/alert';

export function useAvatarPicker(currentPhotoUrl?: string | null) {
  const [isUploading, setIsUploading] = useState(false);
  const [localPreviewUri, setLocalPreviewUri] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();

  const handlePick = async (source: 'camera' | 'library') => {
    if (!user?.id) return;

    const uri = await pickImage(source);
    if (!uri) return;

    setLocalPreviewUri(uri);
    setIsUploading(true);

    try {
      const publicUrl = await uploadAvatar(user.id, uri);
      dispatch(updateProfile({ profilePhotoUrl: publicUrl }));
      setLocalPreviewUri(null);
    } catch (error) {
      await showAlert(
        'Upload Failed',
        error instanceof Error ? error.message : 'Could not upload your photo. Please try again.'
      );
      setLocalPreviewUri(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user?.id) return;

    setIsUploading(true);
    try {
      await deleteAvatar(user.id);
      dispatch(updateProfile({ profilePhotoUrl: undefined }));
    } catch {
      await showAlert('Error', 'Could not remove your photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const showAvatarOptions = () => {
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Take Photo', onPress: () => handlePick('camera') },
      { text: 'Choose from Library', onPress: () => handlePick('library') },
    ];

    if (currentPhotoUrl) {
      buttons.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: handleRemove,
      });
    }

    buttons.push({ text: 'Cancel', style: 'cancel' });

    void showAlert('Change Profile Photo', undefined, buttons);
  };

  return { isUploading, localPreviewUri, showAvatarOptions };
}
