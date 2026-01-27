import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState, AppDispatch } from '../redux/store';
import { updateProfile } from '../redux/slices/profileSlice';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, UserProfile } from '../types';

type ProfileNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user, signOut } = useAuth();

  const profile = useSelector((state: RootState) => state.profile.data);
  const participants = useSelector((state: RootState) => state.participants.data);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: profile?.fullName || '',
    bio: profile?.bio || '',
    city: profile?.city || '',
    state: profile?.state || '',
  });

  const userParticipations = participants.filter(p => p.userId === user?.id);
  const totalPoints = userParticipations.reduce(
    (sum, p) => sum + p.totalPoints,
    0
  );
  const totalChallenges = userParticipations.length;
  const longestStreak = Math.max(
    0,
    ...userParticipations.map(p => p.longestStreak)
  );

  const handleSave = () => {
    dispatch(updateProfile(editForm));
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated');
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Text style={[styles.editButton, { color: colors.primary }]}>
              {isEditing ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View
            style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]}
          >
            {profile?.profilePhotoUrl ? (
              <Image
                source={{ uri: profile.profilePhotoUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {(profile?.fullName || user?.email || '?')[0].toUpperCase()}
              </Text>
            )}
          </View>
          {!isEditing && (
            <>
              <Text style={[styles.userName, { color: colors.text }]}>
                {profile?.fullName || user?.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {user?.email}
              </Text>
            </>
          )}
        </View>

        {isEditing ? (
          /* Edit Form */
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={editForm.fullName}
              onChangeText={text =>
                setEditForm({ ...editForm, fullName: text })
              }
              placeholder="Your name"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={editForm.bio}
              onChangeText={text => setEditForm({ ...editForm, bio: text })}
              placeholder="Tell us about yourself"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.label, { color: colors.text }]}>Location</Text>
            <View style={styles.locationRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.locationInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={editForm.city}
                onChangeText={text => setEditForm({ ...editForm, city: text })}
                placeholder="City"
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[
                  styles.input,
                  styles.stateInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={editForm.state}
                onChangeText={text => setEditForm({ ...editForm, state: text })}
                placeholder="State"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              <View
                style={[styles.statCard, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {totalPoints}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Points
                </Text>
              </View>
              <View
                style={[styles.statCard, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {totalChallenges}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Challenges
                </Text>
              </View>
              <View
                style={[styles.statCard, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {longestStreak}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Best Streak
                </Text>
              </View>
            </View>

            {/* Bio */}
            {profile?.bio && (
              <View
                style={[styles.bioCard, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.bioTitle, { color: colors.text }]}>
                  About
                </Text>
                <Text style={[styles.bioText, { color: colors.textSecondary }]}>
                  {profile.bio}
                </Text>
              </View>
            )}

            {/* Location */}
            {(profile?.city || profile?.state) && (
              <View
                style={[styles.infoCard, { backgroundColor: colors.surface }]}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {[profile.city, profile.state].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionItem, { backgroundColor: colors.surface }]}
                onPress={() => navigation.navigate('PrivacyCenter')}
              >
                <Ionicons
                  name="shield-outline"
                  size={20}
                  color={colors.text}
                />
                <Text style={[styles.actionText, { color: colors.text }]}>
                  Privacy Settings
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionItem, { backgroundColor: colors.surface }]}
                onPress={handleSignOut}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>
                  Sign Out
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  bioCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  bioTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
  },
  actions: {
    gap: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
  },
  form: {
    marginTop: 12,
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
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  locationInput: {
    flex: 2,
  },
  stateInput: {
    flex: 1,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
