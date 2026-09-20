import React, { useContext } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ThemeContext, getColors } from '../../theme/ThemeContext';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function PageHeader({ title, description, action, style }: PageHeaderProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  return (
    <View style={[styles.root, style]}>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
        {description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 24 },
  copy: { flex: 1 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  description: { marginTop: 6, fontSize: 16, lineHeight: 23 },
  action: { flexShrink: 0 },
});
