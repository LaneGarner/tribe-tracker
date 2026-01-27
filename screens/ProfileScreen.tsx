import React, { useContext, useState, useLayoutEffect } from 'react';
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
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState, AppDispatch } from '../redux/store';
import { updateProfile } from '../redux/slices/profileSlice';
import { removeParticipant } from '../redux/slices/participantsSlice';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';

type ProfileNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user } = useAuth();

  const profile = useSelector((state: RootState) => state.profile.data);
  const participants = useSelector((state: RootState) => state.participants.data);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: profile?.fullName || '',
    age: profile?.age?.toString() || '',
    height: profile?.height || '',
    weight: profile?.weight || '',
    bio: profile?.bio || '',
    city: profile?.city || '',
    state: profile?.state || '',
  });

  // Set up header with Edit button
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Profile',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setIsEditing(!isEditing)}
          style={{ paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '500' }}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.primary, isEditing]);

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
  const totalDays = userParticipations.reduce(
    (sum, p) => sum + p.daysParticipated,
    0
  );

  const handleSave = () => {
    dispatch(updateProfile({
      ...editForm,
      age: editForm.age ? parseInt(editForm.age, 10) : undefined,
    }));
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated');
  };

  const handleLeaveChallenge = (participationId: string, challengeName: string) => {
    Alert.alert(
      'Leave Challenge',
      `Are you sure you want to leave "${challengeName}"? Your progress will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            dispatch(removeParticipant(participationId));
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
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

            <Text style={[styles.label, { color: colors.text }]}>Age</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={editForm.age}
              onChangeText={text => setEditForm({ ...editForm, age: text })}
              placeholder="Your age"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: colors.text }]}>Height</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={editForm.height}
                  onChangeText={text => setEditForm({ ...editForm, height: text })}
                  placeholder="e.g. 5'10&quot;"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: colors.text }]}>Weight</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={editForm.weight}
                  onChangeText={text => setEditForm({ ...editForm, weight: text })}
                  placeholder="e.g. 170 lbs"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

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

            {/* Challenges with remove option */}
            {userParticipations.length > 0 && (
              <View style={styles.editChallengesSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Challenges
                </Text>
                {userParticipations.map(participation => (
                  <View
                    key={participation.id}
                    style={[styles.editChallengeItem, { backgroundColor: colors.surface }]}
                  >
                    <View style={styles.challengeInfo}>
                      <Text
                        style={[styles.challengeName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {participation.challengeName || 'Challenge'}
                      </Text>
                      <Text style={[styles.challengeStreak, { color: colors.textSecondary }]}>
                        {participation.totalPoints} pts • {participation.currentStreak} day streak
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.leaveButton, { borderColor: colors.error }]}
                      onPress={() =>
                        handleLeaveChallenge(
                          participation.id,
                          participation.challengeName || 'this challenge'
                        )
                      }
                    >
                      <Text style={[styles.leaveButtonText, { color: colors.error }]}>
                        Leave
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {totalPoints}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Total Points
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {totalChallenges}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Challenges
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {longestStreak}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Best Streak
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {totalDays}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Days Active
                </Text>
              </View>
            </View>

            {/* Challenges */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Challenges
              </Text>
              {userParticipations.length > 0 ? (
                userParticipations.map(participation => (
                  <TouchableOpacity
                    key={participation.id}
                    style={[styles.challengeItem, { backgroundColor: colors.surface }]}
                    onPress={() =>
                      navigation.navigate('ChallengeDetail', {
                        challengeId: participation.challengeId,
                      })
                    }
                  >
                    <View style={styles.challengeInfo}>
                      <Text
                        style={[styles.challengeName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {participation.challengeName || 'Challenge'}
                      </Text>
                      <View style={styles.challengeMeta}>
                        <Text style={[styles.challengePoints, { color: colors.primary }]}>
                          {participation.totalPoints} pts
                        </Text>
                        <Text style={[styles.challengeStreak, { color: colors.textSecondary }]}>
                          {' '}• {participation.currentStreak} day streak
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No challenges yet. Join one to get started!
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
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
    paddingTop: 8,
    paddingBottom: 24,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  challengeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengePoints: {
    fontSize: 14,
    fontWeight: '500',
  },
  challengeStreak: {
    fontSize: 14,
  },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  editChallengesSection: {
    marginTop: 24,
  },
  editChallengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  leaveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  leaveButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
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
