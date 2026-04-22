import React, { useContext, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { CHALLENGE_CATEGORIES } from '../constants/categories';
import { updateProfile } from '../redux/slices/profileSlice';
import { addParticipant } from '../redux/slices/participantsSlice';
import { RootState } from '../redux/store';
import { RootStackParamList, ChallengeParticipant } from '../types';
import {
  fetchChallengeMatches,
  MatchChallengeResult,
} from '../utils/matchChallenges';
import { setWizardSeen } from '../utils/storage';

type WizardNavProp = NativeStackNavigationProp<
  RootStackParamList,
  'OnboardingWizard'
>;

type WizardRouteProp = RouteProp<RootStackParamList, 'OnboardingWizard'>;

type Step = 1 | 2 | 3 | 4 | 5;

type StartingPoint = 'fresh' | 'returning' | 'leveling_up';
type ChallengeStyle = 'gentle' | 'structured' | 'ambitious';

const STARTING_POINT_OPTIONS: { value: StartingPoint; label: string }[] = [
  { value: 'fresh', label: 'Starting fresh' },
  { value: 'returning', label: 'Getting back on track' },
  { value: 'leveling_up', label: 'Ready to level up' },
];

const CHALLENGE_STYLE_OPTIONS: { value: ChallengeStyle; label: string }[] = [
  { value: 'gentle', label: 'Gentle and consistent' },
  { value: 'structured', label: 'Structured with clear steps' },
  { value: 'ambitious', label: 'Ambitious and challenging' },
];

const DESIRED_HABITS_OPTIONS: string[] = [
  'Drink more water',
  'Meditate daily',
  'Exercise regularly',
  'Read daily',
  'Sleep better',
  'Less screen time',
  'Walk outside',
  'Journal',
  'Cook more',
  'Wake up early',
  'Stretch daily',
  'Learn something new',
];

// Per-category follow-up chips. Keys must match CHALLENGE_CATEGORIES keys.
const SPECIFICS_MAP: Record<string, string[]> = {
  Health: ['Exercise', 'Sleep', 'Nutrition', 'Hydration'],
  Discipline: ['Focus', 'Morning routine', 'Screen time', 'Habits'],
  Addiction: ['Smoking', 'Alcohol', 'Social media', 'Sugar', 'Other'],
  'Mental Health': ['Anxiety', 'Sleep', 'Focus', 'Stress', 'Meditation'],
  Lifestyle: ['Reading', 'Side project', 'Learning', 'Relationships'],
  General: [],
};

export default function OnboardingWizardScreen() {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const navigation = useNavigation<WizardNavProp>();
  const route = useRoute<WizardRouteProp>();
  const fromDiscover = route.params?.fromDiscover === true;
  const dispatch = useDispatch();
  const { user, getAccessToken } = useAuth();
  const profile = useSelector((state: RootState) => state.profile.data);

  const [step, setStep] = useState<Step>(1);
  const [goals, setGoals] = useState<string[]>([]);
  const [goalSpecifics, setGoalSpecifics] = useState<Record<string, string[]>>(
    {}
  );
  const [startingPoint, setStartingPoint] = useState<StartingPoint | null>(
    null
  );
  const [challengeStyle, setChallengeStyle] = useState<ChallengeStyle | null>(
    null
  );
  const [desiredHabits, setDesiredHabits] = useState<string[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matches, setMatches] = useState<MatchChallengeResult[]>([]);
  const [selectedChallengeIds, setSelectedChallengeIds] = useState<Set<string>>(
    new Set()
  );

  const toggleGoal = (key: string) => {
    setGoals(prev =>
      prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]
    );
  };

  const toggleDesiredHabit = (habit: string) => {
    setDesiredHabits(prev =>
      prev.includes(habit) ? prev.filter(h => h !== habit) : [...prev, habit]
    );
  };

  const toggleSpecific = (categoryKey: string, option: string) => {
    setGoalSpecifics(prev => {
      const current = prev[categoryKey] || [];
      const next = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      return { ...prev, [categoryKey]: next };
    });
  };

  const buildProfileUpdate = (extra: Record<string, unknown> = {}) => ({
    onboardingCompleted: true,
    goals,
    goalSpecifics,
    desiredHabits,
    startingPoint: startingPoint || undefined,
    challengeStyle: challengeStyle || undefined,
    ...extra,
  });

  const completeOnboarding = (extraProfile: Record<string, unknown> = {}) => {
    dispatch(updateProfile(buildProfileUpdate(extraProfile)));
  };

  const handleSkip = () => {
    if (fromDiscover) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'Skip setup?',
      "You can browse challenges anytime from the Discover tab. We won't show this again.",
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            await setWizardSeen();
            dispatch(updateProfile({ onboardingCompleted: true }));
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
          },
        },
      ]
    );
  };

  const handleFindMatches = async () => {
    setLoadingMatches(true);
    try {
      const token = getAccessToken();
      if (!token) {
        setMatches([]);
        setStep(4);
        return;
      }
      const result = await fetchChallengeMatches(token, {
        goals,
        goalSpecifics,
        startingPoint: startingPoint || undefined,
        challengeStyle: challengeStyle || undefined,
        desiredHabits,
      });
      setMatches(result);
      setStep(4);
    } finally {
      setLoadingMatches(false);
    }
  };

  const toggleSelectMatch = (challengeId: string) => {
    setSelectedChallengeIds(prev => {
      const next = new Set(prev);
      if (next.has(challengeId)) {
        next.delete(challengeId);
      } else {
        next.add(challengeId);
      }
      return next;
    });
  };

  const joinSelectedMatches = () => {
    const now = new Date().toISOString();
    matches
      .filter(m => selectedChallengeIds.has(m.challengeId))
      .forEach(match => {
        const participation: ChallengeParticipant = {
          id: Crypto.randomUUID(),
          challengeId: match.challengeId,
          challengeName: match.challenge.name,
          userId: user?.id || 'anonymous',
          userName:
            user?.user_metadata?.full_name ||
            user?.email?.split('@')[0] ||
            'Anonymous',
          userEmail: user?.email || '',
          userPhotoUrl: profile?.profilePhotoUrl,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          daysParticipated: 0,
          joinDate: now,
          updatedAt: now,
        };
        dispatch(addParticipant(participation));
      });
  };

  const exitAfterComplete = () => {
    if (fromDiscover) {
      navigation.goBack();
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const handleJoinAll = async () => {
    await setWizardSeen();
    joinSelectedMatches();
    completeOnboarding();
    exitAfterComplete();
  };

  const handleSkipMatches = async () => {
    await setWizardSeen();
    completeOnboarding();
    exitAfterComplete();
  };

  const handleCreateChallengeFromEmpty = async () => {
    await setWizardSeen();
    completeOnboarding();
    if (fromDiscover) {
      navigation.replace('CreateChallenge', { mode: 'create' });
      return;
    }
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Main' },
        { name: 'CreateChallenge', params: { mode: 'create' } },
      ],
    });
  };

  const canContinueStep1 = goals.length > 0;
  const canContinueStep2 = startingPoint !== null && challengeStyle !== null;

  const showDots = step >= 1 && step <= 3;
  const dotFilledCount = step >= 4 ? 3 : step;

  return (
    <SafeAreaView
      edges={['top']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header: step dots + Skip (X) */}
        <View style={styles.headerRow}>
          <View style={styles.stepDots}>
            {showDots
              ? [1, 2, 3].map(n => {
                  const filled = n <= dotFilledCount;
                  return (
                    <View
                      key={n}
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor: filled
                            ? colors.primary
                            : colors.surfaceSecondary,
                        },
                      ]}
                    />
                  );
                })
              : null}
          </View>
          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 1 — What are you working on? */}
          {step === 1 && (
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                What are you working on?
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
              >
                Pick everything that calls to you.
              </Text>

              <View style={styles.chipsRow}>
                {CHALLENGE_CATEGORIES.map(cat => {
                  const selected = goals.includes(cat.key);
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      onPress={() => toggleGoal(cat.key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors.surface,
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={cat.label}
                    >
                      <Ionicons
                        name={cat.icon as keyof typeof Ionicons.glyphMap}
                        size={14}
                        color={selected ? '#fff' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? '#fff' : colors.text },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {goals
                .map(g => ({ key: g, options: SPECIFICS_MAP[g] || [] }))
                .filter(e => e.options.length > 0)
                .map(entry => (
                  <View key={entry.key} style={{ marginTop: 20 }}>
                    <Text
                      style={[
                        styles.sectionLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {entry.key}
                    </Text>
                    <View style={styles.chipsRow}>
                      {entry.options.map(opt => {
                        const selected = (
                          goalSpecifics[entry.key] || []
                        ).includes(opt);
                        return (
                          <TouchableOpacity
                            key={opt}
                            onPress={() => toggleSpecific(entry.key, opt)}
                            style={[
                              styles.chip,
                              {
                                backgroundColor: selected
                                  ? colors.primary
                                  : colors.surface,
                                borderColor: selected
                                  ? colors.primary
                                  : colors.border,
                              },
                            ]}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: selected }}
                            accessibilityLabel={opt}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                { color: selected ? '#fff' : colors.text },
                              ]}
                            >
                              {opt}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
            </View>
          )}

          {/* STEP 2 — What does progress look like for you? */}
          {step === 2 && (
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                What does progress look like for you?
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
              >
                Helps us find challenges at the right level.
              </Text>

              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.textSecondary, marginTop: 20 },
                ]}
              >
                How would you describe where you're starting?
              </Text>
              <View style={styles.chipsRow}>
                {STARTING_POINT_OPTIONS.map(opt => {
                  const selected = startingPoint === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setStartingPoint(opt.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors.surface,
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={opt.label}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? '#fff' : colors.text },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.textSecondary, marginTop: 24 },
                ]}
              >
                What kind of challenge fits you best?
              </Text>
              <View style={styles.chipsRow}>
                {CHALLENGE_STYLE_OPTIONS.map(opt => {
                  const selected = challengeStyle === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setChallengeStyle(opt.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors.surface,
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={opt.label}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? '#fff' : colors.text },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 3 — Any habits you already want? */}
          {step === 3 && (
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                Any habits you already want?
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
              >
                Pick any that fit.
              </Text>

              <View style={styles.chipsRow}>
                {DESIRED_HABITS_OPTIONS.map(habit => {
                  const selected = desiredHabits.includes(habit);
                  return (
                    <TouchableOpacity
                      key={habit}
                      onPress={() => toggleDesiredHabit(habit)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors.surface,
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={habit}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? '#fff' : colors.text },
                        ]}
                      >
                        {habit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 4 — Matches */}
          {step === 4 && (
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                {matches.length > 0
                  ? 'Your recommended challenges'
                  : 'Nothing to join yet'}
              </Text>
              {matches.length > 0 ? (
                <Text
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                >
                  Tap any that fit. Review and join on the next step.
                </Text>
              ) : null}

              {matches.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.emptyBody, { color: colors.text }]}>
                    You can create your own challenge right now.
                  </Text>
                  <TouchableOpacity
                    onPress={handleCreateChallengeFromEmpty}
                    style={[
                      styles.primaryButton,
                      { backgroundColor: colors.primary, marginTop: 16 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Create challenge"
                  >
                    <Text
                      style={[styles.primaryButtonText, { color: '#fff' }]}
                    >
                      Create challenge
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSkipMatches}
                    style={[
                      styles.secondaryButton,
                      {
                        borderColor: colors.border,
                        marginTop: 10,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Finish"
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: colors.text },
                      ]}
                    >
                      Finish
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                matches.map(match => {
                  const selected = selectedChallengeIds.has(match.challengeId);
                  return (
                    <TouchableOpacity
                      key={match.challengeId}
                      onPress={() => toggleSelectMatch(match.challengeId)}
                      activeOpacity={0.85}
                      style={[
                        styles.matchCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                          borderWidth: selected ? 2 : 1,
                        },
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`Select ${match.challenge.name}${match.reason ? ' — ' + match.reason : ''}`}
                    >
                      {selected && (
                        <View style={styles.matchCheckmark}>
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color={colors.primary}
                          />
                        </View>
                      )}
                      <Text style={[styles.matchName, { color: colors.text }]}>
                        {match.challenge.name}
                      </Text>
                      {match.reason ? (
                        <Text
                          style={[
                            styles.matchReason,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {match.reason}
                        </Text>
                      ) : null}
                      <View style={styles.matchMeta}>
                        <View style={styles.matchMetaItem}>
                          <Ionicons
                            name="calendar-outline"
                            size={13}
                            color={colors.textTertiary}
                          />
                          <Text
                            style={[
                              styles.matchMetaText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {match.challenge.durationDays} days
                          </Text>
                        </View>
                        <View style={styles.matchMetaItem}>
                          <Ionicons
                            name="checkbox-outline"
                            size={13}
                            color={colors.textTertiary}
                          />
                          <Text
                            style={[
                              styles.matchMetaText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {match.challenge.habits.length} habits
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {/* STEP 5 — Confirmation */}
          {step === 5 && (
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                Ready to commit?
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
              >
                These challenges will be added to your list.
              </Text>

              <View style={{ marginTop: 16 }}>
                {matches
                  .filter(m => selectedChallengeIds.has(m.challengeId))
                  .map((match, idx, arr) => (
                    <View
                      key={match.challengeId}
                      style={[
                        styles.confirmRow,
                        {
                          borderBottomColor: colors.border,
                          borderBottomWidth:
                            idx === arr.length - 1
                              ? 0
                              : StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.confirmName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {match.challenge.name}
                      </Text>
                      <Text
                        style={[
                          styles.confirmDuration,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {match.challenge.durationDays} days
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          {step === 1 && (
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    flex: 1,
                    backgroundColor: canContinueStep1
                      ? colors.primary
                      : colors.surfaceSecondary,
                  },
                ]}
                disabled={!canContinueStep1}
                onPress={() => setStep(2)}
                accessibilityRole="button"
                accessibilityLabel="Continue"
                accessibilityState={{ disabled: !canContinueStep1 }}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    {
                      color: canContinueStep1 ? '#fff' : colors.textSecondary,
                    },
                  ]}
                >
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: colors.border },
                ]}
                onPress={() => setStep(1)}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    flex: 1,
                    backgroundColor: canContinueStep2
                      ? colors.primary
                      : colors.surfaceSecondary,
                  },
                ]}
                disabled={!canContinueStep2}
                onPress={() => setStep(3)}
                accessibilityRole="button"
                accessibilityLabel="Continue"
                accessibilityState={{ disabled: !canContinueStep2 }}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    {
                      color: canContinueStep2 ? '#fff' : colors.textSecondary,
                    },
                  ]}
                >
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: colors.border },
                ]}
                onPress={() => setStep(2)}
                disabled={loadingMatches}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    flex: 1,
                    backgroundColor: loadingMatches
                      ? colors.surfaceSecondary
                      : colors.primary,
                  },
                ]}
                onPress={handleFindMatches}
                disabled={loadingMatches}
                accessibilityRole="button"
                accessibilityLabel="Find my matches"
              >
                {loadingMatches ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text
                    style={[styles.primaryButtonText, { color: '#fff' }]}
                  >
                    Find my matches
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 4 && matches.length > 0 && (
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    flex: 1,
                    backgroundColor:
                      selectedChallengeIds.size > 0
                        ? colors.primary
                        : colors.surfaceSecondary,
                  },
                ]}
                disabled={selectedChallengeIds.size === 0}
                onPress={() => setStep(5)}
                accessibilityRole="button"
                accessibilityLabel="Review selections"
                accessibilityState={{
                  disabled: selectedChallengeIds.size === 0,
                }}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    {
                      color:
                        selectedChallengeIds.size > 0
                          ? '#fff'
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Review selections
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 5 && (
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: colors.border },
                ]}
                onPress={() => setStep(4)}
                accessibilityRole="button"
                accessibilityLabel="Go back to selections"
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  Go back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { flex: 1, backgroundColor: colors.primary },
                ]}
                onPress={handleJoinAll}
                accessibilityRole="button"
                accessibilityLabel="Join all selected challenges"
              >
                <Text style={[styles.primaryButtonText, { color: '#fff' }]}>
                  Join all
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    minHeight: 32,
  },
  stepDots: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 24, height: 4, borderRadius: 2 },
  closeButton: { padding: 4 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 15, lineHeight: 20, marginBottom: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  matchCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    position: 'relative',
  },
  matchCheckmark: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  matchName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    paddingRight: 28,
  },
  matchReason: { fontSize: 14, lineHeight: 19, marginBottom: 10 },
  matchMeta: { flexDirection: 'row', gap: 16 },
  matchMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  matchMetaText: { fontSize: 13 },
  emptyCard: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyBody: { fontSize: 16, lineHeight: 22 },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  confirmName: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 12 },
  confirmDuration: { fontSize: 13 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: { flexDirection: 'row', gap: 10 },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '500' },
});
