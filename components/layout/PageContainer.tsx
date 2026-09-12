import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PageContainer({
  children,
  maxWidth = 1200,
  scroll = true,
  style,
  contentStyle,
  testID,
}: PageContainerProps) {
  const { gutter } = useResponsiveLayout();
  const content = (
    <View style={[styles.content, { maxWidth, paddingHorizontal: gutter }, contentStyle]}>
      {children}
    </View>
  );

  if (!scroll) {
    return <View testID={testID} style={[styles.root, style]}>{content}</View>;
  }

  return (
    <ScrollView
      testID={testID}
      style={[styles.root, style]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  content: { width: '100%', alignSelf: 'center', paddingVertical: 24 },
});
