import React, { useContext } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAIConsent } from '../../context/AIConsentContext';
import { ThemeContext, getColors } from '../../theme/ThemeContext';

export function withAIConsentGate<P extends object>(
  Screen: React.ComponentType<P>
) {
  return function AIConsentGatedScreen(props: P) {
    const {
      hasAIConsent,
      isLoading,
      grantAIConsent,
    } = useAIConsent();
    const { colorScheme } = useContext(ThemeContext);
    const colors = getColors(colorScheme);

    if (isLoading) return null;
    if (hasAIConsent('personal_coaching')) return <Screen {...props} />;

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Choose whether to use AI guidance
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          AI guidance uses relevant goals, challenge details, check-ins, and
          streak information. It does not use your chat messages. The result is
          general wellness support, not medical or mental health treatment.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => grantAIConsent('personal_coaching')}
        >
          <Text style={styles.buttonText}>Allow AI-assisted guidance</Text>
        </TouchableOpacity>
        <Text style={[styles.note, { color: colors.textTertiary }]}>
          You can change this later in Privacy Center.
        </Text>
      </View>
    );
  };
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, marginTop: 14, textAlign: 'center' },
  button: { borderRadius: 12, marginTop: 24, paddingHorizontal: 22, paddingVertical: 14 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  note: { fontSize: 12, marginTop: 12 },
});
