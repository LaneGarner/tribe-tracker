import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface ResponsiveColumnsProps {
  primary: React.ReactNode;
  secondary: React.ReactNode;
  secondaryWidth?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export default function ResponsiveColumns({
  primary,
  secondary,
  secondaryWidth = 340,
  gap = 24,
  style,
}: ResponsiveColumnsProps) {
  const { isWide } = useResponsiveLayout();
  return (
    <View style={[styles.root, isWide && styles.wide, { gap }, style]}>
      <View style={styles.primary}>{primary}</View>
      <View style={isWide ? { width: secondaryWidth } : styles.secondaryStacked}>
        {secondary}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  wide: { flexDirection: 'row', alignItems: 'flex-start' },
  primary: { flex: 1, minWidth: 0 },
  secondaryStacked: { width: '100%' },
});
