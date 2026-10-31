import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import Skeleton from '../ui/Skeleton';
import EmptyChat from './EmptyChat';

export default function MessageListPlaceholder({ loading, failed, onRetry }: {
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
}) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  if (loading) {
    return (
      <View style={styles.skeletons} accessibilityLabel="Loading messages" accessibilityState={{ busy: true }}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.bubbles}>
          {[68, 46, 74, 55, 62].map((width, index) => (
            <Skeleton key={index} width={`${width}%`} height={index % 2 ? 48 : 68} borderRadius={18}
              style={{ alignSelf: index % 2 ? 'flex-end' : 'flex-start' }} />
          ))}
        </View>
      </View>
    );
  }
  if (failed) {
    return (
      <View style={styles.error}>
        <Text style={{ color: colors.textSecondary }}>Couldn’t load messages.</Text>
        <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={styles.retry}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return <EmptyChat type="messages" />;
}

const styles = StyleSheet.create({
  skeletons: { flex: 1, justifyContent: 'flex-end', padding: 20, paddingBottom: 80 },
  bubbles: { gap: 16 },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  retry: { padding: 12 },
});
