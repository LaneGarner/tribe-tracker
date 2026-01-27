import React, { useContext, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { AppDispatch, RootState } from '../redux/store';
import { addChallenge } from '../redux/slices/challengesSlice';
import { addParticipant } from '../redux/slices/participantsSlice';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, Challenge, ChallengeParticipant } from '../types';
import { getToday, getChallengeEndDate } from '../utils/dateUtils';

type CreateChallengeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CreateChallenge'
>;

type CreateChallengeRouteProp = RouteProp<RootStackParamList, 'CreateChallenge'>;

export default function CreateChallengeScreen() {
  const navigation = useNavigation<CreateChallengeNavigationProp>();
  const route = useRoute<CreateChallengeRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user } = useAuth();

  const [mode, setMode] = useState<'browse' | 'create' | 'join'>(route.params?.mode || 'browse');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [habits, setHabits] = useState<string[]>(['']);
  const [isPublic, setIsPublic] = useState(true);
  const [inviteCode, setInviteCode] = useState('');

  const [errors, setErrors] = useState<{
    name?: string;
    duration?: string;
    habits?: string;
  }>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const habitInputRefs = useRef<(TextInput | null)[]>([]);

  const challenges = useSelector((state: RootState) => state.challenges.data);
  const publicChallenges = challenges.filter(c => c.isPublic);

  const addHabit = () => {
    const newIndex = habits.length;
    setHabits([...habits, '']);
    setTimeout(() => {
      habitInputRefs.current[newIndex]?.focus();
    }, 50);
  };

  const removeHabit = (index: number) => {
    if (habits.length > 1) {
      setHabits(habits.filter((_, i) => i !== index));
    }
  };

  const updateHabit = (index: number, value: string) => {
    const newHabits = [...habits];
    newHabits[index] = value;
    setHabits(newHabits);
  };

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreate = () => {
    const validHabits = habits.filter(h => h.trim());
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Challenge name is required';
    }
    if (!durationDays.trim() || parseInt(durationDays) <= 0) {
      newErrors.duration = 'Duration is required';
    }
    if (validHabits.length === 0) {
      newErrors.habits = 'At least one habit is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsCreating(true);

    const challengeId = Crypto.randomUUID();
    const newChallenge: Challenge = {
      id: challengeId,
      name: name.trim(),
      description: description.trim() || undefined,
      creatorId: user?.id || 'anonymous',
      creatorName: user?.email?.split('@')[0] || 'Anonymous',
      durationDays: parseInt(durationDays) || 30,
      startDate: getToday(),
      endDate: getChallengeEndDate(getToday(), parseInt(durationDays) || 30),
      habits: validHabits,
      isPublic,
      inviteCode: generateInviteCode(),
      status: 'active',
      participantCount: 1,
      updatedAt: new Date().toISOString(),
    };

    dispatch(addChallenge(newChallenge));

    // Auto-join creator
    const participation: ChallengeParticipant = {
      id: Crypto.randomUUID(),
      challengeId: challengeId,
      challengeName: newChallenge.name,
      userId: user?.id || 'anonymous',
      userName: user?.email?.split('@')[0] || 'Anonymous',
      userEmail: user?.email || '',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      daysParticipated: 0,
      joinDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch(addParticipant(participation));

    setIsCreating(false);
    Alert.alert('Success', 'Challenge created!', [
      {
        text: 'OK',
        onPress: () => {
          setMode('browse');
          setName('');
          setDescription('');
          setDurationDays('30');
          setHabits(['']);
          setErrors({});
        },
      },
    ]);
  };

  const handleJoinByCode = () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    const challenge = challenges.find(
      c => c.inviteCode?.toUpperCase() === inviteCode.toUpperCase()
    );

    if (!challenge) {
      Alert.alert('Error', 'Invalid invite code');
      return;
    }

    // Check if already joined
    // TODO: Check participants

    const participation: ChallengeParticipant = {
      id: Crypto.randomUUID(),
      challengeId: challenge.id,
      challengeName: challenge.name,
      userId: user?.id || 'anonymous',
      userName: user?.email?.split('@')[0] || 'Anonymous',
      userEmail: user?.email || '',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      daysParticipated: 0,
      joinDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsJoining(true);
    dispatch(addParticipant(participation));

    setIsJoining(false);
    Alert.alert('Success', `Joined "${challenge.name}"!`, [
      { text: 'OK', onPress: () => setMode('browse') },
    ]);
  };

  const renderBrowse = () => (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Challenges</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => setMode('create')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Create Challenge</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => setMode('join')}
        >
          <Ionicons name="key" size={20} color={colors.text} />
          <Text style={[styles.actionButtonTextAlt, { color: colors.text }]}>
            Join by Code
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Public Challenges
      </Text>

      {publicChallenges.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="globe-outline"
            size={48}
            color={colors.textTertiary}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No public challenges yet
          </Text>
        </View>
      ) : (
        publicChallenges.map(challenge => (
          <TouchableOpacity
            key={challenge.id}
            style={[styles.challengeItem, { backgroundColor: colors.surface }]}
            onPress={() =>
              navigation.navigate('ChallengeDetail', {
                challengeId: challenge.id,
              })
            }
          >
            <View style={styles.challengeInfo}>
              <Text style={[styles.challengeName, { color: colors.text }]}>
                {challenge.name}
              </Text>
              <Text
                style={[styles.challengeMeta, { color: colors.textSecondary }]}
              >
                {challenge.durationDays} days • {challenge.habits.length} habits
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        ))
      )}
    </>
  );

  const renderCreate = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex1}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMode('browse')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Create Challenge
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.text }]}>
          Challenge Name <Text style={{ color: colors.error }}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: errors.name ? colors.error : colors.border,
            },
          ]}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors(e => ({ ...e, name: undefined }));
          }}
          placeholder="e.g., 30-Day Fitness Challenge"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
        />
        {errors.name && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {errors.name}
          </Text>
        )}

        <Text style={[styles.label, { color: colors.text }]}>Description</Text>
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
          value={description}
          onChangeText={setDescription}
          placeholder="What's this challenge about?"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
        />

        <Text style={[styles.label, { color: colors.text }]}>
          Duration (days) <Text style={{ color: colors.error }}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: errors.duration ? colors.error : colors.border,
            },
          ]}
          value={durationDays}
          onChangeText={(text) => {
            setDurationDays(text);
            if (errors.duration) setErrors(e => ({ ...e, duration: undefined }));
          }}
          placeholder="30"
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
        />
        {errors.duration && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {errors.duration}
          </Text>
        )}

        <Text style={[styles.label, { color: colors.text }]}>
          Daily Habits <Text style={{ color: colors.error }}>*</Text>
        </Text>
        {habits.map((habit, index) => (
          <View key={index} style={styles.habitRow}>
            <TextInput
              ref={(el) => { habitInputRefs.current[index] = el; }}
              style={[
                styles.input,
                styles.habitInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: errors.habits ? colors.error : colors.border,
                },
              ]}
              value={habit}
              onChangeText={text => {
                updateHabit(index, text);
                if (errors.habits) setErrors(e => ({ ...e, habits: undefined }));
              }}
              placeholder={`Habit ${index + 1}`}
              placeholderTextColor={colors.textTertiary}
            />
            {habits.length > 1 && (
              <TouchableOpacity
                style={styles.removeHabitButton}
                onPress={() => removeHabit(index)}
              >
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        {errors.habits && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {errors.habits}
          </Text>
        )}
        <TouchableOpacity style={styles.addHabitButton} onPress={addHabit}>
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={[styles.addHabitText, { color: colors.primary }]}>
            Add Habit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setIsPublic(!isPublic)}
        >
          <Text style={[styles.toggleLabel, { color: colors.text }]}>
            Make challenge public
          </Text>
          <Ionicons
            name={isPublic ? 'checkbox' : 'square-outline'}
            size={24}
            color={isPublic ? colors.primary : colors.textTertiary}
          />
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.fixedButtonContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary, marginBottom: 0, opacity: isCreating ? 0.7 : 1 }]}
          onPress={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Challenge</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderJoin = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMode('browse')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Join by Code</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.joinContent}>
        <Ionicons name="key" size={64} color={colors.textTertiary} />
        <Text style={[styles.joinTitle, { color: colors.text }]}>
          Have an invite code?
        </Text>
        <Text style={[styles.joinSubtitle, { color: colors.textSecondary }]}>
          Enter the code shared by your friend to join their challenge.
        </Text>

        <TextInput
          style={[
            styles.codeInput,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="XXXXXX"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
          maxLength={6}
        />

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isJoining ? 0.7 : 1 }]}
          onPress={handleJoinByCode}
          disabled={isJoining}
        >
          {isJoining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Join Challenge</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  if (mode === 'create') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={[styles.scrollContent, styles.flex1]}>
          {renderCreate()}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {mode === 'browse' && renderBrowse()}
        {mode === 'join' && renderJoin()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextAlt: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
    fontSize: 13,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
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
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  habitInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeHabitButton: {
    marginLeft: 12,
  },
  addHabitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  addHabitText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 24,
  },
  toggleLabel: {
    fontSize: 16,
  },
  fixedButtonContainer: {
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  joinContent: {
    alignItems: 'center',
    paddingTop: 40,
  },
  joinTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  joinSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 4,
    textAlign: 'center',
    width: 200,
    marginBottom: 24,
  },
});
