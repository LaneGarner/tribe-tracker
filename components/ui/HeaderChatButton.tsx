import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { selectTotalUnreadCount } from '../../redux/slices/chatSlice';

interface HeaderChatButtonProps {
  color?: string;
  style?: ViewStyle;
  onDarkBackground?: boolean;
  /**
   * When true (default), the button wraps itself in an absolutely-positioned
   * container anchored to the top-right of the screen using safe-area insets.
   * Set to false to render the button inline (e.g., inside a menu row).
   */
  floating?: boolean;
}

export default function HeaderChatButton({
  color,
  style,
  onDarkBackground,
  floating = true,
}: HeaderChatButtonProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const navigation = useNavigation<any>();
  const unread = useSelector(selectTotalUnreadCount);
  const insets = useSafeAreaInsets();

  const iconColor = color || (onDarkBackground ? '#FFFFFF' : colors.text);
  const unreadLabel =
    unread > 0
      ? `Chat, ${unread} unread message${unread === 1 ? '' : 's'}`
      : 'Chat';

  const button = (
    <TouchableOpacity
      style={[styles.button, !floating && style]}
      onPress={() => navigation.navigate('Chat')}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      accessibilityRole="button"
      accessibilityLabel={unreadLabel}
    >
      <MessageCircle size={24} color={iconColor} strokeWidth={2} />
      {unread > 0 && (
        <View style={[styles.badge, { borderColor: onDarkBackground ? '#000' : colors.background }]}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (!floating) {
    return button;
  }

  return (
    <View
      style={[
        styles.floatingContainer,
        { top: insets.top + 8 },
        style,
      ]}
      pointerEvents="box-none"
    >
      {button}
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    right: 12,
    zIndex: 50,
    elevation: 50,
  },
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
