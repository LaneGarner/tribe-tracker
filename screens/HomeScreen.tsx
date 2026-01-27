import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState, AppDispatch } from '../redux/store';
import { loadChallengesFromStorage } from '../redux/slices/challengesSlice';
import { loadCheckinsFromStorage } from '../redux/slices/checkinsSlice';
import { loadParticipantsFromStorage } from '../redux/slices/participantsSlice';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, Challenge, HabitCheckin } from '../types';
import { getToday, formatDate, getChallengeStatus } from '../utils/dateUtils';
import ChallengeCard from '../components/challenge/ChallengeCard';
import HabitChecklist from '../components/challenge/HabitChecklist';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user } = useAuth();

  const challenges = useSelector((state: RootState) => state.challenges.data);
  const checkins = useSelector((state: RootState) => state.checkins.data);
  const participants = useSelector((state: RootState) => state.participants.data);
  const loading = useSelector((state: RootState) => state.challenges.loading);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null
  );

  // Load data on mount
  useEffect(() => {
    dispatch(loadChallengesFromStorage());
    dispatch(loadCheckinsFromStorage());
    dispatch(loadParticipantsFromStorage());
  }, [dispatch]);

  // Set initial selected challenge
  useEffect(() => {
    if (challenges.length > 0 && !selectedChallengeId) {
      // Find first active challenge
      const activeChallenge = challenges.find(
        c => getChallengeStatus(c.startDate, c.endDate || c.startDate) === 'active'
      );
      setSelectedChallengeId(activeChallenge?.id || challenges[0].id);
    }
  }, [challenges, selectedChallengeId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(loadChallengesFromStorage()),
      dispatch(loadCheckinsFromStorage()),
      dispatch(loadParticipantsFromStorage()),
    ]);
    setRefreshing(false);
  };

  const selectedChallenge = challenges.find(c => c.id === selectedChallengeId);

  // Get today's checkin for selected challenge
  const todayCheckin = checkins.find(
    c =>
      c.challengeId === selectedChallengeId &&
      c.userId === user?.id &&
      c.checkinDate === getToday()
  );

  // Get user's participation in selected challenge
  const userParticipation = participants.find(
    p => p.challengeId === selectedChallengeId && p.userId === user?.id
  );

  // Filter active challenges
  const activeChallenges = challenges.filter(
    c => getChallengeStatus(c.startDate, c.endDate || c.startDate) === 'active'
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {formatDate(getToday(), 'dddd, MMM D')}
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              Today's Progress
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={[styles.settingsButton, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Challenge selector */}
        {activeChallenges.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.challengeSelector}
            contentContainerStyle={styles.challengeSelectorContent}
          >
            {activeChallenges.map(challenge => (
              <TouchableOpacity
                key={challenge.id}
                style={[
                  styles.challengeTab,
                  {
                    backgroundColor:
                      selectedChallengeId === challenge.id
                        ? colors.primary
                        : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setSelectedChallengeId(challenge.id)}
              >
                <Text
                  style={[
                    styles.challengeTabText,
                    {
                      color:
                        selectedChallengeId === challenge.id
                          ? '#fff'
                          : colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {challenge.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Selected challenge card */}
        {selectedChallenge ? (
          <>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ChallengeDetail', {
                  challengeId: selectedChallenge.id,
                })
              }
            >
              <ChallengeCard
                challenge={selectedChallenge}
                participation={userParticipation}
              />
            </TouchableOpacity>

            {/* Today's habits checklist */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Today's Habits
              </Text>
              <HabitChecklist
                challenge={selectedChallenge}
                checkin={todayCheckin}
              />
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="trophy-outline"
              size={64}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Active Challenges
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Join a challenge or create your own to get started!
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => (navigation as any).navigate('Challenges')}
            >
              <Ionicons name="search" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.emptyButtonText}>Find Challenges</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.textButton}
              onPress={() => navigation.navigate('CreateChallenge', { mode: 'create' })}
            >
              <Text style={[styles.textButtonText, { color: colors.primary }]}>
                or create your own
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeSelector: {
    marginTop: 16,
  },
  challengeSelectorContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  challengeTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  challengeTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  textButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 8,
  },
  textButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
