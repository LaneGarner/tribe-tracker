import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMembership } from '../../context/MembershipContext';
import { MembershipCapability } from '../../types/membership';
import { useContext } from 'react';
import { ThemeContext, getColors } from '../../theme/ThemeContext';

export function withCapabilityGate<P extends object>(
  Screen: React.ComponentType<P>,
  capability: MembershipCapability,
  title: string
) {
  return function CapabilityGatedScreen(props: P) {
    const navigation = useNavigation<any>();
    const { membership, isLoading } = useMembership();
    const { colorScheme } = useContext(ThemeContext);
    const colors = getColors(colorScheme);

    if (isLoading) return null;
    if (membership.capabilities[capability]) {
      return <Screen {...props} />;
    }

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          This is part of Pro. Your challenges, check-ins, leaderboard, current
          streak, basic chat, and basic badges remain available on Free.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Paywall', { feature: capability })}
        >
          <Text style={styles.buttonText}>See Pro options</Text>
        </TouchableOpacity>
      </View>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, marginTop: 12, textAlign: 'center' },
  button: { borderRadius: 12, marginTop: 24, paddingHorizontal: 24, paddingVertical: 14 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

