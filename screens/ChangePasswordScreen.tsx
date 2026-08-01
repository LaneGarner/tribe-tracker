import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { deleteAccount } from '../services/account';

export default function ChangePasswordScreen() {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { updatePassword, getAccessToken, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = password.length >= 8 && password === confirmation && !submitting;

  async function submit() {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      Alert.alert('Passwords do not match', 'Enter the same password in both fields.');
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) {
      Alert.alert('Password not updated', error.message);
      return;
    }
    setPassword('');
    setConfirmation('');
    Alert.alert('Password updated', 'Use your new password the next time you sign in.');
  }

  function confirmDeletion() {
    Alert.alert(
      'Delete Account?',
      'This permanently deletes your TribeTracker account and personal data. Deleting the account does not cancel an Apple or Google subscription.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => Alert.alert(
            'Confirm Permanent Deletion',
            'Delete your account and personal data now?',
            [
              { text: 'Keep Account', style: 'cancel' },
              {
                text: 'Delete Account',
                style: 'destructive',
                onPress: async () => {
                  const token = getAccessToken();
                  if (!token) {
                    Alert.alert('Unable to Delete', 'Please sign in again and retry.');
                    return;
                  }
                  try {
                    await deleteAccount(token);
                    await signOut();
                  } catch (error) {
                    Alert.alert('Deletion Failed', error instanceof Error ? error.message : 'Account deletion is temporarily unavailable.');
                  }
                },
              },
            ],
          ),
        },
      ],
    );
  }

  function PasswordField({
    label,
    value,
    onChangeText,
    autoFocus,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    autoFocus?: boolean;
  }) {
    return (
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.passwordField}>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={!visible}
            autoComplete="new-password"
            textContentType="newPassword"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={autoFocus}
          />
          <TouchableOpacity
            style={styles.visibilityButton}
            onPress={() => setVisible(current => !current)}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide passwords' : 'Show passwords'}
            accessibilityState={{ selected: visible }}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}> 
          <Ionicons name="key-outline" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Change your password</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>Choose a password you do not use for another service. You will remain signed in on this device.</Text>
        <PasswordField label="New password" value={password} onChangeText={setPassword} autoFocus />
        <PasswordField label="Confirm new password" value={confirmation} onChangeText={setConfirmation} />
        <Text style={[styles.help, { color: colors.textTertiary }]}>Use at least 8 characters.</Text>
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: canSubmit ? colors.primary : colors.surface },
          ]}
          disabled={!canSubmit}
          onPress={submit}
          accessibilityRole="button"
          accessibilityLabel="Update password"
          accessibilityState={{ disabled: !canSubmit }}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <Text style={[styles.submitText, { color: canSubmit ? '#fff' : colors.textTertiary }]}>Update password</Text>
          )}
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.dangerTitle, { color: colors.text }]}>Delete account</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>Permanently remove your account and associated personal data. This cannot be undone.</Text>
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.error }]}
          onPress={confirmDeletion}
          accessibilityRole="button"
          accessibilityLabel="Permanently delete account"
        >
          <Text style={[styles.deleteText, { color: colors.error }]}>Delete account permanently</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 24, paddingBottom: 48 },
  iconContainer: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 18, marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  description: { fontSize: 16, lineHeight: 23, marginBottom: 28 },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  passwordField: { position: 'relative' },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingRight: 54, fontSize: 17 },
  visibilityButton: { position: 'absolute', right: 4, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  help: { marginTop: -8, marginBottom: 24, fontSize: 14 },
  submitButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  submitText: { fontSize: 17, fontWeight: '800' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 34 },
  dangerTitle: { fontSize: 21, fontWeight: '800', marginBottom: 8 },
  deleteButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14 },
  deleteText: { fontSize: 16, fontWeight: '800' },
});
