import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface ResponsiveGridProps {
  children: React.ReactNode;
  compactColumns?: number;
  mediumColumns?: number;
  wideColumns?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export default function ResponsiveGrid({
  children,
  compactColumns = 1,
  mediumColumns = 2,
  wideColumns = 3,
  gap = 16,
  style,
}: ResponsiveGridProps) {
  const { size } = useResponsiveLayout();
  const columns = size === 'compact' ? compactColumns : size === 'medium' ? mediumColumns : wideColumns;
  const basis = `${100 / Math.max(1, columns)}%` as `${number}%`;

  return (
    <View style={[styles.grid, { margin: -gap / 2 }, style]}>
      {React.Children.map(children, child => (
        <View style={{ flexBasis: basis, maxWidth: basis, padding: gap / 2 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
