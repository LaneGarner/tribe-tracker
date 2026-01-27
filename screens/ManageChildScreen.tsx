import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootStackParamList } from '../types';

type ManageChildRouteProp = RouteProp<RootStackParamList, 'ManageChild'>;
type ManageChildNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ManageChild'
>;

export default function ManageChildScreen() {
  const navigation = useNavigation<ManageChildNavigationProp>();
  const route = useRoute<ManageChildRouteProp>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const { childId } = route.params;

  const [childName, setChildName] = useState('');
  const [restrictions, setRestrictions] = useState({
    canJoinPublicChallenges: true,
    canChat: false,
    requireApproval: true,
  });

  const handleSave = () => {
    Alert.alert('Success', 'Child account settings saved');
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Placeholder content */}
        <View style={styles.placeholderContent}>
          <Ionicons
            name="people-outline"
            size={64}
            color={colors.textTertiary}
          />
          <Text style={[styles.placeholderTitle, { color: colors.text }]}>
            Child Account Management
          </Text>
          <Text
            style={[styles.placeholderSubtitle, { color: colors.textSecondary }]}
          >
            This feature allows parents to manage their child's account
            settings, including privacy controls and challenge permissions.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Child Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={childName}
            onChangeText={setChildName}
            placeholder="Enter child's name"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Permissions
          </Text>

          <TouchableOpacity
            style={[styles.toggleRow, { backgroundColor: colors.surface }]}
            onPress={() =>
              setRestrictions(r => ({
                ...r,
                canJoinPublicChallenges: !r.canJoinPublicChallenges,
              }))
            }
          >
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                Join Public Challenges
              </Text>
              <Text
                style={[styles.toggleDescription, { color: colors.textSecondary }]}
              >
                Allow child to join public challenges
              </Text>
            </View>
            <Ionicons
              name={
                restrictions.canJoinPublicChallenges
                  ? 'checkbox'
                  : 'square-outline'
              }
              size={24}
              color={
                restrictions.canJoinPublicChallenges
                  ? colors.primary
                  : colors.textTertiary
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleRow, { backgroundColor: colors.surface }]}
            onPress={() =>
              setRestrictions(r => ({ ...r, canChat: !r.canChat }))
            }
          >
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                Chat Features
              </Text>
              <Text
                style={[styles.toggleDescription, { color: colors.textSecondary }]}
              >
                Allow child to use chat features
              </Text>
            </View>
            <Ionicons
              name={restrictions.canChat ? 'checkbox' : 'square-outline'}
              size={24}
              color={
                restrictions.canChat ? colors.primary : colors.textTertiary
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleRow, { backgroundColor: colors.surface }]}
            onPress={() =>
              setRestrictions(r => ({
                ...r,
                requireApproval: !r.requireApproval,
              }))
            }
          >
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                Require Approval
              </Text>
              <Text
                style={[styles.toggleDescription, { color: colors.textSecondary }]}
              >
                Require parent approval for new challenges
              </Text>
            </View>
            <Ionicons
              name={restrictions.requireApproval ? 'checkbox' : 'square-outline'}
              size={24}
              color={
                restrictions.requireApproval
                  ? colors.primary
                  : colors.textTertiary
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  placeholderContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  form: {
    marginTop: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 13,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
