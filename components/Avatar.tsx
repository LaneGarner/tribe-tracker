import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EyeOff } from 'lucide-react-native';
import { ANONYMOUS_PHOTO_SENTINEL } from '../utils/pseudonyms';

const AVATAR_GRADIENT = ['#60A5FA', '#A855F7'] as [string, string];
const ANONYMOUS_GRADIENT = ['#6B7280', '#9CA3AF'] as [string, string];

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

interface AvatarProps {
  imageUrl?: string | null;
  name?: string;
  email?: string;
  size?: number;
  onPress?: () => void;
  showCameraBadge?: boolean;
  isUploading?: boolean;
  style?: ViewStyle;
}

export default function Avatar({
  imageUrl,
  name,
  email,
  size = 48,
  onPress,
  showCameraBadge = false,
  isUploading = false,
  style,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  const isAnonymous = imageUrl === ANONYMOUS_PHOTO_SENTINEL;
  const showImage = !!imageUrl && !isAnonymous && !imageError;
  const initials = getInitials(name, email);
  const fontSize = size * 0.4;
  const badgeSize = Math.max(24, size * 0.3);

  const avatarContent = (
    <View style={[{ width: size, height: size, borderRadius: size / 2 }, style]}>
      {isAnonymous ? (
        <LinearGradient
          colors={ANONYMOUS_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <EyeOff size={size * 0.45} color="#fff" strokeWidth={2} />
        </LinearGradient>
      ) : showImage ? (
        <ExpoImage
          source={{ uri: imageUrl }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          contentFit="cover"
          cachePolicy="disk"
          onError={() => setImageError(true)}
        />
      ) : (
        <LinearGradient
          colors={AVATAR_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize, fontWeight: 'bold', color: '#fff' }}>
            {initials}
          </Text>
        </LinearGradient>
      )}

      {isUploading && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: size / 2,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <ActivityIndicator color="#fff" />
        </View>
      )}

      {showCameraBadge && !isUploading && (
        <View
          style={[
            styles.cameraBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              bottom: 0,
              right: 0,
            },
          ]}
        >
          <Ionicons name="camera" size={badgeSize * 0.55} color="#fff" />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={
          isAnonymous ? `Anonymous participant${name ? `, ${name}` : ''}`
            : showImage ? 'Profile photo'
            : `Avatar showing initials ${initials}`
        }
        accessibilityHint="Double tap to change your profile photo"
        accessibilityState={{ busy: isUploading }}
      >
        {avatarContent}
      </TouchableOpacity>
    );
  }

  return avatarContent;
}

const styles = StyleSheet.create({
  cameraBadge: {
    position: 'absolute',
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
