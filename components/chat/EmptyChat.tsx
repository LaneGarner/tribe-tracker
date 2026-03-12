import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext, getColors } from '../../theme/ThemeContext';

interface EmptyChatProps {
  type: 'chat' | 'messages';
}

const CONFIG = {
  chat: {
    icon: 'chatbubbles-outline' as const,
    title: 'No Conversations',
    subtitle: 'Join a challenge or start a direct message.',
  },
  messages: {
    icon: 'chatbubbles-outline' as const,
    title: 'No Messages Yet',
    subtitle: 'Send a message to get the conversation going.',
  },
};

export default function EmptyChat({ type }: EmptyChatProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const config = CONFIG[type];

  return (
    <View style={styles.container}>
      <Ionicons name={config.icon} size={56} color={colors.textTertiary} />
      <Text style={[styles.title, { color: colors.text }]}>
        {config.title}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {config.subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
