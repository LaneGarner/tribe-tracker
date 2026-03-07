import { useState } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { updateProfile } from '../redux/slices/profileSlice';
import { useAuth } from '../context/AuthContext';
import { pickImage, uploadAvatar, deleteAvatar } from '../utils/imageUpload';

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
    } catch {
      Alert.alert('Upload Failed', 'Could not upload your photo. Please try again.');
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
      Alert.alert('Error', 'Could not remove your photo. Please try again.');
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

    Alert.alert('Change Profile Photo', undefined, buttons);
  };

  return { isUploading, localPreviewUri, showAvatarOptions };
}
