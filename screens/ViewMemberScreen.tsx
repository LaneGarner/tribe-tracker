import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState } from '../redux/store';
import { RootStackParamList } from '../types';

type ViewMemberRouteProp = RouteProp<RootStackParamList, 'ViewMember'>;
type ViewMemberNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ViewMember'
>;

export default function ViewMemberScreen() {
  const navigation = useNavigation<ViewMemberNavigationProp>();
  const route = useRoute<ViewMemberRouteProp>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const { userId } = route.params;

  // Find user's participations
  const participants = useSelector((state: RootState) =>
    state.participants.data.filter(p => p.userId === userId)
  );

  const profile = useSelector((state: RootState) => state.profile.data);

  // Get user info from first participation (or use placeholder)
  const userInfo = participants[0] || {
    userName: 'Unknown User',
    userEmail: '',
    userPhotoUrl: null,
  };

  // Calculate stats
  const totalPoints = participants.reduce((sum, p) => sum + p.totalPoints, 0);
  const totalChallenges = participants.length;
  const longestStreak = Math.max(0, ...participants.map(p => p.longestStreak));
  const totalDays = participants.reduce(
    (sum, p) => sum + p.daysParticipated,
    0
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View
            style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]}
          >
            {userInfo.userPhotoUrl ? (
              <Image
                source={{ uri: userInfo.userPhotoUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {userInfo.userName[0].toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>
            {userInfo.userName}
          </Text>
        </View>

        {/* Stats */}
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

        {/* Challenge participations */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Challenge History
          </Text>
          {participants.length > 0 ? (
            participants.map(participation => (
              <TouchableOpacity
                key={participation.id}
                style={[
                  styles.challengeItem,
                  { backgroundColor: colors.surface },
                ]}
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
                    <Text
                      style={[
                        styles.challengePoints,
                        { color: colors.primary },
                      ]}
                    >
                      {participation.totalPoints} pts
                    </Text>
                    <Text
                      style={[
                        styles.challengeStreak,
                        { color: colors.textSecondary },
                      ]}
                    >
                      • {participation.currentStreak} day streak
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
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No challenge history
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
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
    fontSize: 24,
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
    marginLeft: 4,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
