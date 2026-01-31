import React, { useContext, useState, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Share,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState, AppDispatch } from '../redux/store';
import { updateProfile } from '../redux/slices/profileSlice';
import { removeParticipant, makeSelectParticipantsByUserId } from '../redux/slices/participantsSlice';
import { deleteChallenge } from '../redux/slices/challengesSlice';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, Challenge } from '../types';

type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;
type ProfileNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Profile'
>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigationProp>();
  const route = useRoute<ProfileRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user } = useAuth();

  // Determine if viewing own profile or another user's
  const { userId } = route.params ?? {};
  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id;

  const profile = useSelector((state: RootState) => state.profile.data);
  const challenges = useSelector((state: RootState) => state.challenges.data);

  // For viewing other users, use memoized selector
  const selectParticipantsByUserId = useMemo(makeSelectParticipantsByUserId, []);
  const participants = useSelector((state: RootState) =>
    isOwnProfile
      ? state.participants.data
      : selectParticipantsByUserId(state, targetUserId || '')
  );

  // Get user info for display (from profile for own, from participant for others)
  const otherUserInfo = useMemo(() => {
    if (isOwnProfile) return null;
    const firstParticipant = participants.find(p => p.userId === targetUserId);
    return firstParticipant
      ? {
          userName: firstParticipant.userName,
          userPhotoUrl: firstParticipant.userPhotoUrl,
        }
      : { userName: 'Unknown User', userPhotoUrl: null };
  }, [isOwnProfile, participants, targetUserId]);

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

  // Set up header with Edit button (only for own profile)
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Profile',
      headerRight: isOwnProfile
        ? () => (
            <TouchableOpacity
              onPress={() => setIsEditing(!isEditing)}
              style={{ paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '500' }}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, colors.primary, isEditing, isOwnProfile]);

  const userParticipations = participants.filter(p => p.userId === targetUserId);
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

  // Enrich participations with challenge data
  const enrichedParticipations = useMemo(() => {
    return userParticipations.map(participation => {
      const challenge = challenges.find(c => c.id === participation.challengeId);
      const isCreator = challenge?.creatorId === targetUserId;
      const daysLeft = challenge?.endDate
        ? Math.max(0, dayjs(challenge.endDate).diff(dayjs(), 'day'))
        : 0;
      const status = challenge?.status || 'active';
      return {
        ...participation,
        challenge,
        isCreator,
        daysLeft,
        status,
      };
    });
  }, [userParticipations, challenges, targetUserId]);

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

  const handleDeleteChallenge = (challengeId: string, challengeName: string) => {
    Alert.alert(
      'Delete Challenge',
      `Are you sure you want to delete "${challengeName}"? This will remove it for all participants.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteChallenge(challengeId));
          },
        },
      ]
    );
  };

  const handleShareInvite = async (challenge: Challenge | undefined) => {
    if (!challenge) return;
    try {
      const message = challenge.isPublic
        ? `Join my challenge "${challenge.name}" on Tribe Tracker!`
        : `Join my private challenge "${challenge.name}" on Tribe Tracker! Use invite code: ${challenge.inviteCode}`;
      await Share.share({ message });
    } catch {
      // User cancelled share
    }
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
            {isOwnProfile ? (
              profile?.profilePhotoUrl ? (
                <Image
                  source={{ uri: profile.profilePhotoUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {(profile?.fullName || user?.email || '?')[0].toUpperCase()}
                </Text>
              )
            ) : otherUserInfo?.userPhotoUrl ? (
              <Image
                source={{ uri: otherUserInfo.userPhotoUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {(otherUserInfo?.userName || '?')[0].toUpperCase()}
              </Text>
            )}
          </View>
          {!isEditing && (
            <>
              <Text style={[styles.userName, { color: colors.text }]}>
                {isOwnProfile
                  ? profile?.fullName || user?.email?.split('@')[0] || 'User'
                  : otherUserInfo?.userName || 'User'}
              </Text>
            </>
          )}
        </View>

        {isEditing && isOwnProfile ? (
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
            <View style={[styles.challengesCard, { backgroundColor: colors.surface }]}>
              {/* Header */}
              <View style={styles.challengesHeader}>
                <Ionicons name="trophy-outline" size={20} color={colors.primary} />
                <Text style={[styles.challengesTitle, { color: colors.text }]}>
                  {isOwnProfile ? 'My Challenges' : 'Challenges'} ({enrichedParticipations.length})
                </Text>
              </View>

              {enrichedParticipations.length > 0 ? (
                <>
                  {isOwnProfile && (
                    <Text style={[styles.challengesSubheader, { color: colors.textSecondary }]}>
                      Active Challenges
                    </Text>
                  )}
                  {enrichedParticipations.map(participation => (
                    <TouchableOpacity
                      key={participation.id}
                      style={[
                        styles.challengeCard,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                      onPress={() =>
                        navigation.navigate('ChallengeDetail', {
                          challengeId: participation.challengeId,
                        })
                      }
                      activeOpacity={0.7}
                    >
                      {/* Challenge name and badges */}
                      <View style={styles.challengeNameRow}>
                        <Text
                          style={[styles.challengeName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {participation.challengeName || 'Challenge'}
                        </Text>
                        <View style={[styles.badge, { backgroundColor: '#e8f5e9' }]}>
                          <Text style={[styles.badgeText, { color: '#4caf50' }]}>
                            {participation.status === 'active' ? 'Active' : participation.status}
                          </Text>
                        </View>
                        {participation.isCreator && (
                          <View style={[styles.badge, { backgroundColor: '#fce4ec' }]}>
                            <Text style={[styles.badgeText, { color: '#e91e63' }]}>Creator</Text>
                          </View>
                        )}
                      </View>

                      {/* Stats row */}
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Ionicons name="trophy-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.statText, { color: colors.textSecondary }]}>
                            {participation.totalPoints} pts
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Ionicons name="flame-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.statText, { color: colors.textSecondary }]}>
                            {participation.currentStreak} streak
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.statText, { color: colors.textSecondary }]}>
                            {participation.daysLeft} days left
                          </Text>
                        </View>
                      </View>

                      {/* Action buttons - only for own profile */}
                      {isOwnProfile && (
                        <View style={styles.actionButtonsRow}>
                          <TouchableOpacity
                            style={[styles.actionButton, { borderColor: colors.primary }]}
                            onPress={() =>
                              navigation.navigate('TaskAnalytics', {
                                challengeId: participation.challengeId,
                              })
                            }
                          >
                            <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
                          </TouchableOpacity>

                          {participation.isCreator ? (
                            <>
                              <TouchableOpacity
                                style={[styles.actionButton, { borderColor: '#c084fc' }]}
                                onPress={() =>
                                  navigation.navigate('CreateChallenge', {
                                    mode: 'create',
                                    challengeId: participation.challengeId,
                                  })
                                }
                              >
                                <Ionicons name="pencil-outline" size={20} color="#a855f7" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionButton, { borderColor: '#4ade80' }]}
                                onPress={() =>
                                  navigation.navigate('ChallengeDetail', {
                                    challengeId: participation.challengeId,
                                  })
                                }
                              >
                                <Ionicons name="sync-outline" size={20} color="#22c55e" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionButton, { borderColor: colors.primary }]}
                                onPress={() => handleShareInvite(participation.challenge)}
                              >
                                <Ionicons name="mail-outline" size={20} color={colors.primary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.deleteButton]}
                                onPress={() =>
                                  handleDeleteChallenge(
                                    participation.challengeId,
                                    participation.challengeName || 'this challenge'
                                  )
                                }
                              >
                                <Ionicons name="trash-outline" size={20} color="#fff" />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <TouchableOpacity
                              style={[styles.leaveButtonLarge, { borderColor: colors.error }]}
                              onPress={() =>
                                handleLeaveChallenge(
                                  participation.id,
                                  participation.challengeName || 'this challenge'
                                )
                              }
                            >
                              <Ionicons name="close" size={18} color={colors.error} />
                              <Text style={[styles.leaveButtonLargeText, { color: colors.error }]}>
                                Leave Challenge
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <View style={styles.emptyState}>
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
  challengesCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  challengesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  challengesTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  challengesSubheader: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  challengeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  challengeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  challengeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef5350',
    borderColor: '#ef5350',
  },
  leaveButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  leaveButtonLargeText: {
    fontSize: 14,
    fontWeight: '500',
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
  challengeInfo: {
    flex: 1,
  },
  challengeStreak: {
    fontSize: 14,
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
