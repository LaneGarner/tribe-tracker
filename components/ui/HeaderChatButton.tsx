import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { selectTotalUnreadCount } from '../../redux/slices/chatSlice';

interface HeaderChatButtonProps {
  color?: string;
  style?: ViewStyle;
  onDarkBackground?: boolean;
}

export default function HeaderChatButton({ color, style, onDarkBackground }: HeaderChatButtonProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const navigation = useNavigation<any>();
  const unread = useSelector(selectTotalUnreadCount);

  const iconColor = color || (onDarkBackground ? '#FFFFFF' : colors.text);
  const unreadLabel =
    unread > 0
      ? `Chat, ${unread} unread message${unread === 1 ? '' : 's'}`
      : 'Chat';

  return (
    <TouchableOpacity
      style={[styles.button, style]}
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
}

const styles = StyleSheet.create({
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
