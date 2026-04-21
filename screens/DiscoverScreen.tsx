import React, { useContext, useState, useRef, useEffect } from 'react';
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
  RefreshControl,
  Modal,
  Keyboard,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { PublicChallengeListSkeleton } from '../components/challenge/PublicChallengeCardSkeleton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { CHALLENGE_CATEGORIES, DEFAULT_CATEGORY } from '../constants/categories';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let NestableScrollContainer: any = null;
let NestableDraggableFlatList: any = null;
let ScaleDecorator: any = null;
if (!isExpoGo) {
  try {
    const draggableModule = require('react-native-draggable-flatlist');
    NestableScrollContainer = draggableModule.NestableScrollContainer;
    NestableDraggableFlatList = draggableModule.NestableDraggableFlatList;
    ScaleDecorator = draggableModule.ScaleDecorator;
  } catch (e) {
    // Not available in Expo Go
  }
}

const FormScrollView = (!isExpoGo && NestableScrollContainer) ? NestableScrollContainer : ScrollView;
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { AppDispatch, RootState } from '../redux/store';
import { addChallenge, importChallenge, updateChallenge, fetchPublicChallenges, fetchChallengesFromServer, loadChallengesFromStorage } from '../redux/slices/challengesSlice';
import { API_URL, isBackendConfigured } from '../config/api';
import { addParticipant, importParticipant, fetchParticipantsFromServer } from '../redux/slices/participantsSlice';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, Challenge, ChallengeParticipant } from '../types';
import { getToday, getChallengeEndDate, formatDate, getChallengeStatus } from '../utils/dateUtils';
import Toggle from '../components/Toggle';
import HeaderChatButton from '../components/ui/HeaderChatButton';
import PublicChallengeCard from '../components/challenge/PublicChallengeCard';
import ColorThemePicker from '../components/challenge/ColorThemePicker';
import { TAB_BAR_HEIGHT } from '../constants/layout';
import { CARD_GRADIENTS, getGradientForIndex } from '../constants/gradients';
import { TabBarGradientFade } from '../components/ui/TabBarGradientFade';
import { pickImage, uploadChallengeBackground, deleteChallengeBackground } from '../utils/imageUpload';

type CreateChallengeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CreateChallenge'
>;

type CreateChallengeRouteProp = RouteProp<RootStackParamList, 'CreateChallenge'>;

export default function DiscoverScreen() {
  const navigation = useNavigation<CreateChallengeNavigationProp>();
  const route = useRoute<CreateChallengeRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user, getAccessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const [mode, setMode] = useState<'browse' | 'create' | 'join'>(route.params?.mode || 'browse');

  // Edit mode detection
  const editChallengeId = route.params?.challengeId;
  const existingChallenge = useSelector((state: RootState) =>
    editChallengeId ? state.challenges.data.find(c => c.id === editChallengeId) : undefined
  );
  const isEditMode = Boolean(editChallengeId && existingChallenge);
  const isActiveChallenge = existingChallenge?.status === 'active';
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // Fetch public challenges when in browse mode
  useEffect(() => {
    if (mode === 'browse') {
      const token = getAccessToken();
      if (token) {
        dispatch(fetchPublicChallenges(token)).finally(() => setInitialFetchDone(true));
      }
    }
  }, [mode, dispatch, getAccessToken]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getChallengeEndDate(getToday(), 30));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  type HabitItem = { id: string; text: string };
  const makeHabitItem = (text: string = ''): HabitItem => ({
    id: Crypto.randomUUID(),
    text,
  });
  const [habits, setHabits] = useState<HabitItem[]>([makeHabitItem()]);
  const [isPublic, setIsPublic] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePreset, setRecurrencePreset] = useState<'weekly' | 'biweekly' | 'monthly' | 'custom'>('weekly');
  const [gapDays, setGapDays] = useState('0');
  const [backgroundImageUri, setBackgroundImageUri] = useState<string | null>(null);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [themeColor, setThemeColor] = useState<number>(0);
  const [customThemeColor, setCustomThemeColor] = useState<string | null>(null);
  const [useBackgroundImage, setUseBackgroundImage] = useState(true);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [inviteCode, setInviteCode] = useState(route.params?.inviteCode || '');

  // Pre-fill invite code from deep link
  useEffect(() => {
    if (route.params?.inviteCode) {
      setMode('join');
      setInviteCode(route.params.inviteCode);
    }
  }, [route.params?.inviteCode]);

  // Pre-populate form when editing
  useEffect(() => {
    if (isEditMode && existingChallenge) {
      setName(existingChallenge.name);
      setDescription(existingChallenge.description || '');
      setDurationDays(String(existingChallenge.durationDays));
      setStartDate(existingChallenge.startDate);
      setEndDate(existingChallenge.endDate || getChallengeEndDate(existingChallenge.startDate, existingChallenge.durationDays));
      setHabits(
        existingChallenge.habits.length > 0
          ? existingChallenge.habits.map(h => makeHabitItem(h))
          : [makeHabitItem()]
      );
      setIsPublic(existingChallenge.isPublic);
      if (existingChallenge.isRecurring) {
        setIsRecurring(true);
        setGapDays(String(existingChallenge.gapDays ?? 0));
        const days = existingChallenge.durationDays;
        if (days === 7) setRecurrencePreset('weekly');
        else if (days === 14) setRecurrencePreset('biweekly');
        else if (days === 30) setRecurrencePreset('monthly');
        else setRecurrencePreset('custom');
      }
      setBackgroundImageUri(existingChallenge.backgroundImageUrl || null);
      setThemeColor(existingChallenge.themeColor ?? 0);
      setCustomThemeColor(existingChallenge.customThemeColor ?? null);
      setUseBackgroundImage(existingChallenge.useBackgroundImage ?? true);
      setCategory(existingChallenge.category || DEFAULT_CATEGORY);
    }
  }, [isEditMode, existingChallenge]);

  const [errors, setErrors] = useState<{
    name?: string;
    duration?: string;
    habits?: string;
  }>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(loadChallengesFromStorage());
    const token = getAccessToken();
    if (token && isBackendConfigured()) {
      await dispatch(fetchPublicChallenges(token));
    }
    setRefreshing(false);
  };

  const habitInputRefs = useRef<(TextInput | null)[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  const profile = useSelector((state: RootState) => state.profile.data);
  const challenges = useSelector((state: RootState) => state.challenges.data);
  const activePublicChallenges = challenges.filter(
    c => c.isPublic && getChallengeStatus(c.startDate, c.endDate || c.startDate, c) === 'active'
  );
  const upcomingPublicChallenges = challenges.filter(
    c => c.isPublic && ['upcoming', 'gap'].includes(getChallengeStatus(c.startDate, c.endDate || c.startDate, c))
  );
  const completedPublicChallenges = challenges.filter(
    c => c.isPublic && getChallengeStatus(c.startDate, c.endDate || c.startDate, c) === 'completed'
  );

  const groupByCategory = (list: Challenge[]) => {
    const groups = new Map<string, Challenge[]>();
    for (const c of list) {
      const key = c.category || DEFAULT_CATEGORY;
      // Map unrecognized categories to general
      const resolvedKey = CHALLENGE_CATEGORIES.some(cat => cat.key === key) ? key : DEFAULT_CATEGORY;
      const existing = groups.get(resolvedKey) || [];
      existing.push(c);
      groups.set(resolvedKey, existing);
    }
    return CHALLENGE_CATEGORIES
      .filter(cat => groups.has(cat.key))
      .map(cat => ({ category: cat, challenges: groups.get(cat.key)! }));
  };

  const addHabit = () => {
    const newItem = makeHabitItem();
    const newHabits = [...habits, newItem];
    setHabits(newHabits);
    const newIndex = newHabits.length - 1;
    setTimeout(() => {
      habitInputRefs.current[newIndex]?.focus();
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const removeHabit = (id: string) => {
    if (habits.length > 1) {
      setHabits(habits.filter(h => h.id !== id));
    }
  };

  const updateHabit = (id: string, value: string) => {
    setHabits(habits.map(h => h.id === id ? { ...h, text: value } : h));
  };

  const moveHabit = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= habits.length) return;
    const newHabits = [...habits];
    [newHabits[index], newHabits[newIndex]] = [newHabits[newIndex], newHabits[index]];
    setHabits(newHabits);
  };

  const handlePickBackground = () => {
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Choose from Library', onPress: async () => {
        const uri = await pickImage('library', { aspect: [16, 9], quality: 0.8 });
        if (uri) setBackgroundImageUri(uri);
      }},
      { text: 'Take Photo', onPress: async () => {
        const uri = await pickImage('camera', { aspect: [16, 9], quality: 0.8 });
        if (uri) setBackgroundImageUri(uri);
      }},
    ];

    if (backgroundImageUri) {
      buttons.push({
        text: 'Remove Background',
        style: 'destructive',
        onPress: () => setBackgroundImageUri(null),
      });
    }

    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Background Image', undefined, buttons);
  };

  const isScheduleLocked = isEditMode && isActiveChallenge;

  const handleStartDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (!selectedDate) return;
    const newStart = dayjs(selectedDate).format('YYYY-MM-DD');
    const duration = parseInt(durationDays) || 30;
    setStartDate(newStart);
    setEndDate(getChallengeEndDate(newStart, duration));
  };

  const handleEndDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (!selectedDate) return;
    const newEnd = dayjs(selectedDate).format('YYYY-MM-DD');
    const newDuration = dayjs(newEnd).diff(dayjs(startDate), 'day') + 1;
    if (newDuration >= 1) {
      setEndDate(newEnd);
      setDurationDays(String(newDuration));
    }
  };

  const handleDurationChange = (text: string) => {
    setDurationDays(text);
    if (errors.duration) setErrors(e => ({ ...e, duration: undefined }));
    const parsed = parseInt(text);
    if (parsed > 0) {
      setEndDate(getChallengeEndDate(startDate, parsed));
    }
  };

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreate = () => {
    const validHabits = habits.map(h => h.text.trim()).filter(Boolean);
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

    // Confirm before creating if start date is today (challenge becomes immediately active)
    const startsToday = !isEditMode && startDate === getToday();
    if (startsToday) {
      Alert.alert(
        'Start Immediately?',
        'This challenge will begin today and the duration cannot be changed once active. Continue?',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Start Now', onPress: () => executeCreate() },
        ]
      );
      return;
    }

    executeCreate();
  };

  const executeCreate = async () => {
    const validHabits = habits.map(h => h.text.trim()).filter(Boolean);
    setIsCreating(true);

    // Handle edit mode
    if (isEditMode && existingChallenge) {
      let backgroundImageUrl = existingChallenge.backgroundImageUrl;

      // Upload new background image if changed
      if (backgroundImageUri && backgroundImageUri !== existingChallenge.backgroundImageUrl) {
        try {
          setIsUploadingBackground(true);
          backgroundImageUrl = await uploadChallengeBackground(existingChallenge.id, backgroundImageUri);
        } catch {
          Alert.alert('Upload Failed', 'Could not upload background image. Your other changes were saved.');
          backgroundImageUrl = existingChallenge.backgroundImageUrl;
        } finally {
          setIsUploadingBackground(false);
        }
      } else if (!backgroundImageUri && existingChallenge.backgroundImageUrl) {
        // Background was removed
        try {
          await deleteChallengeBackground(existingChallenge.id);
        } catch {
          // Non-critical, continue
        }
        backgroundImageUrl = undefined;
      }

      const parsedDuration = parseInt(durationDays) || existingChallenge.durationDays;
      const updatedChallenge: Challenge = {
        ...existingChallenge,
        name: name.trim(),
        description: description.trim() || undefined,
        habits: validHabits,
        isPublic,
        backgroundImageUrl,
        themeColor,
        customThemeColor: customThemeColor || undefined,
        useBackgroundImage,
        inviteCode: isPublic
          ? undefined
          : (existingChallenge.inviteCode || generateInviteCode()),
        // Only update schedule if challenge hasn't started yet
        ...(existingChallenge.status === 'upcoming' && {
          startDate,
          durationDays: parsedDuration,
          endDate,
        }),
        // Recurring fields (can update gap even when active)
        isRecurring: isRecurring || undefined,
        ...(isRecurring && {
          recurrenceIntervalDays: parsedDuration,
          gapDays: parseInt(gapDays) || 0,
        }),
        category: category || DEFAULT_CATEGORY,
        updatedAt: new Date().toISOString(),
      };

      dispatch(updateChallenge(updatedChallenge));
      setIsCreating(false);

      Alert.alert('Success', 'Challenge updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    // Handle create mode
    const challengeId = Crypto.randomUUID();

    // Upload background image if selected
    let backgroundImageUrl: string | undefined;
    console.log('Background image URI:', backgroundImageUri ? 'present' : 'null');
    if (backgroundImageUri) {
      try {
        setIsUploadingBackground(true);
        backgroundImageUrl = await uploadChallengeBackground(challengeId, backgroundImageUri);
        console.log('Background upload succeeded:', backgroundImageUrl);
      } catch (err) {
        console.log('Background upload failed:', err);
        Alert.alert('Upload Failed', 'Could not upload background image. The challenge was created without it.');
      } finally {
        setIsUploadingBackground(false);
      }
    }

    const today = getToday();
    const isFutureStart = dayjs(startDate).isAfter(dayjs(today), 'day');
    const parsedDuration = parseInt(durationDays) || 30;
    const newChallenge: Challenge = {
      id: challengeId,
      name: name.trim(),
      description: description.trim() || undefined,
      creatorId: user?.id || 'anonymous',
      creatorName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous',
      durationDays: parsedDuration,
      startDate,
      endDate,
      habits: validHabits,
      backgroundImageUrl,
      themeColor,
      customThemeColor: customThemeColor || undefined,
      useBackgroundImage,
      isPublic,
      inviteCode: isPublic ? undefined : generateInviteCode(),
      status: isFutureStart ? 'upcoming' : 'active',
      participantCount: 0,
      ...(isRecurring && {
        isRecurring: true,
        recurrenceIntervalDays: parsedDuration,
        gapDays: parseInt(gapDays) || 0,
        currentCycle: 1,
        cycleStartDate: startDate,
        cycleEndDate: endDate,
      }),
      category: category || DEFAULT_CATEGORY,
      updatedAt: new Date().toISOString(),
    };

    dispatch(addChallenge(newChallenge));
    setIsCreating(false);

    const resetForm = () => {
      setMode('browse');
      setName('');
      setDescription('');
      setDurationDays('30');
      setStartDate(getToday());
      setEndDate(getChallengeEndDate(getToday(), 30));
      setHabits([makeHabitItem()]);
      setBackgroundImageUri(null);
      setThemeColor(0);
      setCustomThemeColor(null);
      setUseBackgroundImage(true);
      setIsRecurring(false);
      setRecurrencePreset('weekly');
      setGapDays('0');
      setCategory(DEFAULT_CATEGORY);
      setErrors({});
    };

    const joinChallenge = () => {
      const participation: ChallengeParticipant = {
        id: Crypto.randomUUID(),
        challengeId: challengeId,
        challengeName: newChallenge.name,
        userId: user?.id || 'anonymous',
        userName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous',
        userEmail: user?.email || '',
        userPhotoUrl: profile?.profilePhotoUrl,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        daysParticipated: 0,
        joinDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dispatch(addParticipant(participation));
      dispatch(updateChallenge({ ...newChallenge, participantCount: 1 }));
    };

    Alert.alert(
      'Challenge Created!',
      'Would you like to join this challenge?',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: resetForm,
        },
        {
          text: 'Join Challenge',
          onPress: () => {
            joinChallenge();
            Alert.alert('Joined!', `You've joined "${newChallenge.name}"`, [
              { text: 'OK', onPress: resetForm },
            ]);
          },
        },
      ]
    );
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    setIsJoining(true);

    // Try local lookup first
    let challenge = challenges.find(
      c => c.inviteCode?.toUpperCase() === inviteCode.toUpperCase()
    );

    // If not found locally, try the backend
    if (!challenge && isBackendConfigured()) {
      try {
        const token = await getAccessToken();
        if (token) {
          const response = await fetch(
            `${API_URL}/api/invite?code=${encodeURIComponent(inviteCode.trim())}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (response.ok) {
            const data = await response.json();
            if (data.challenge) {
              challenge = data.challenge;
              // Use importChallenge to avoid triggering a spurious backend POST
              dispatch(importChallenge(data.challenge));
            }
          }
        }
      } catch {
        // Backend unavailable, continue with local-only result
      }
    }

    if (!challenge) {
      setIsJoining(false);
      Alert.alert('Error', 'Invalid invite code. Please check and try again.');
      return;
    }

    const participation: ChallengeParticipant = {
      id: Crypto.randomUUID(),
      challengeId: challenge.id,
      challengeName: challenge.name,
      userId: user?.id || 'anonymous',
      userName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous',
      userEmail: user?.email || '',
      userPhotoUrl: profile?.profilePhotoUrl,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      daysParticipated: 0,
      joinDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add participant locally without triggering sync middleware
    dispatch(importParticipant(participation));

    // Directly POST participant to backend (awaited to guarantee persistence)
    if (isBackendConfigured()) {
      try {
        const token = await getAccessToken();
        if (token) {
          const response = await fetch(`${API_URL}/api/participants`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              participant: {
                ...participation,
                updated_at: new Date().toISOString(),
              },
            }),
          });
          if (!response.ok) {
            console.error('[JoinByCode] Failed to sync participant:', await response.text());
          }

          // Fire-and-forget: refresh from server for consistency
          dispatch(fetchChallengesFromServer(token));
          dispatch(fetchParticipantsFromServer(token));
        }
      } catch (err) {
        console.error('[JoinByCode] Failed to sync participant:', err);
      }
    }

    setIsJoining(false);
    Alert.alert('Success', `Joined "${challenge.name}"!`, [
      { text: 'OK', onPress: () => navigation.navigate('Main', { screen: 'Home', params: { selectChallengeId: challenge.id } }) },
    ]);
  };

  const renderGroupedChallenges = (list: Challenge[], startIndex: number) => {
    let flatIndex = startIndex;
    return groupByCategory(list).map(({ category: cat, challenges: grouped }) => (
      <View key={cat.key}>
        <View
          style={styles.categorySubHeader}
          accessibilityRole="header"
          accessible
          accessibilityLabel={cat.label}
        >
          <Ionicons
            name={cat.icon as any}
            size={16}
            color={colors.textSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <Text style={[styles.categorySubHeaderText, { color: colors.textSecondary }]}>
            {cat.label}
          </Text>
        </View>
        {grouped.map((challenge) => {
          const idx = flatIndex++;
          return (
            <PublicChallengeCard
              key={challenge.id}
              challenge={challenge}
              gradientColors={getGradientForIndex(idx)}
              onPress={() =>
                navigation.navigate('ChallengeDetail', {
                  challengeId: challenge.id,
                })
              }
            />
          );
        })}
      </View>
    ));
  };

  const renderBrowse = () => (
    <>
      <View style={styles.browseHeader}>
        <Text style={[styles.title, { color: colors.text, textAlign: 'center' }]}>Discover</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setMode('create')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#F97316', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>New Challenge</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface, paddingVertical: 14 }]}
          onPress={() => setMode('join')}
        >
          <Ionicons name="key" size={20} color={colors.text} />
          <Text style={[styles.actionButtonTextAlt, { color: colors.text }]}>
            Join By Code
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.browseIntro}>
        <Text style={[styles.browseIntroTitle, { color: colors.text }]}>
          Public Challenges
        </Text>
        <Text style={[styles.browseIntroSubtitle, { color: colors.textSecondary }]}>
          Join a challenge, commit with a group, stack real wins together.
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate('OnboardingWizard')}
        activeOpacity={0.85}
        style={[
          styles.wizardPromptCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Not sure where to start? Answer a few questions for a short list of matches."
      >
        <Ionicons name="sparkles" size={20} color="#3B82F6" />
        <Text
          style={[styles.wizardPromptCardText, { color: colors.text }]}
          numberOfLines={2}
        >
          Not sure where to start?{' '}
          <Text style={{ color: colors.primary, fontWeight: '600' }}>
            Answer a few questions
          </Text>{' '}
          for a short list of matches.
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </TouchableOpacity>


      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Active
      </Text>

      {!initialFetchDone ? (
        <PublicChallengeListSkeleton count={3} />
      ) : (
        <>
          {activePublicChallenges.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="globe-outline"
                size={48}
                color={colors.textTertiary}
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No active public challenges
              </Text>
            </View>
          ) : (
            renderGroupedChallenges(activePublicChallenges, 0)
          )}

          {upcomingPublicChallenges.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
                Upcoming
              </Text>
              {renderGroupedChallenges(upcomingPublicChallenges, activePublicChallenges.length)}
            </>
          )}

          {completedPublicChallenges.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
                Completed
              </Text>
              {renderGroupedChallenges(completedPublicChallenges, activePublicChallenges.length + upcomingPublicChallenges.length)}
            </>
          )}
        </>
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
        <TouchableOpacity onPress={() => isEditMode ? navigation.goBack() : setMode('browse')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {isEditMode ? 'Edit Challenge' : 'Create Challenge'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <FormScrollView ref={scrollViewRef} style={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>
            Public challenge
          </Text>
          <Toggle
            value={isPublic}
            onValueChange={setIsPublic}
            accessibilityLabel="Toggle challenge visibility"
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Category
        </Text>
        <View style={styles.presetRow} accessibilityRole="radiogroup" accessibilityLabel="Category">
          {CHALLENGE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: category === cat.key ? colors.primary : colors.surface,
                  borderColor: category === cat.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setCategory(cat.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: category === cat.key }}
              accessibilityLabel={cat.label}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={category === cat.key ? '#fff' : colors.textSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              <Text style={[
                styles.presetChipText,
                { color: category === cat.key ? '#fff' : colors.text },
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Card Appearance
        </Text>

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>
            Use color theme
          </Text>
          <Toggle
            value={!useBackgroundImage}
            onValueChange={(val) => setUseBackgroundImage(!val)}
            accessibilityLabel="Toggle between color theme and background image"
          />
        </View>

        {!useBackgroundImage ? (
          <ColorThemePicker
            selectedIndex={customThemeColor ? null : themeColor}
            customColor={customThemeColor}
            onSelectPreset={(index) => {
              setThemeColor(index);
              setCustomThemeColor(null);
            }}
            onSelectCustom={setCustomThemeColor}
          />
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.backgroundImagePicker,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={handlePickBackground}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={backgroundImageUri ? 'Change background image' : 'Add background image'}
              accessibilityHint="Opens image picker for challenge card background"
            >
              {backgroundImageUri ? (
                <ExpoImage
                  source={{ uri: backgroundImageUri }}
                  style={styles.backgroundImagePreview}
                  contentFit="cover"
                  cachePolicy="disk"
                />
              ) : (
                <View style={styles.backgroundImagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
                  <Text style={[styles.backgroundImagePlaceholderText, { color: colors.textTertiary }]}>
                    Add a background image
                  </Text>
                </View>
              )}
              {isUploadingBackground && (
                <View style={styles.backgroundImageUploadingOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={[styles.helperText, { color: colors.textTertiary }]}>
              Shown behind the challenge card on the home screen
            </Text>
          </>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Schedule
        </Text>

        <Text style={[styles.label, { color: colors.text }]}>Start Date</Text>
        <TouchableOpacity
          style={[
            styles.dateRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => !isScheduleLocked && setShowStartPicker(true)}
          disabled={isScheduleLocked}
          accessibilityRole="button"
          accessibilityLabel={`Start date: ${formatDate(startDate)}`}
          accessibilityState={{ disabled: isScheduleLocked }}
          accessibilityHint={isScheduleLocked ? 'Cannot change start date for active challenges' : 'Tap to change start date'}
        >
          <Text style={[styles.dateText, { color: isScheduleLocked ? colors.textTertiary : colors.text }]}>
            {formatDate(startDate)}
          </Text>
          <Ionicons
            name={isScheduleLocked ? 'lock-closed' : 'chevron-forward'}
            size={18}
            color={isScheduleLocked ? colors.textTertiary : colors.textSecondary}
          />
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.text }]}>
          Duration (days) <Text style={{ color: colors.error }}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              color: isScheduleLocked ? colors.textTertiary : colors.text,
              borderColor: errors.duration ? colors.error : colors.border,
            },
          ]}
          value={durationDays}
          onChangeText={handleDurationChange}
          placeholder="30"
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          editable={!isScheduleLocked}
        />
        {errors.duration && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {errors.duration}
          </Text>
        )}

        <Text style={[styles.label, { color: colors.text }]}>End Date</Text>
        <TouchableOpacity
          style={[
            styles.dateRow,
            {
              backgroundColor: isScheduleLocked ? colors.surface : colors.background,
              borderColor: colors.border,
            },
          ]}
          onPress={() => !isScheduleLocked && setShowEndPicker(true)}
          disabled={isScheduleLocked}
          accessibilityRole="button"
          accessibilityLabel={`End date: ${formatDate(endDate)}`}
          accessibilityState={{ disabled: isScheduleLocked }}
          accessibilityHint={isScheduleLocked ? 'Cannot change end date for active challenges' : 'Tap to change end date'}
        >
          <Text style={[styles.dateText, { color: isScheduleLocked ? colors.textTertiary : colors.text }]}>
            {formatDate(endDate)}
          </Text>
          <Ionicons
            name={isScheduleLocked ? 'lock-closed' : 'chevron-forward'}
            size={18}
            color={isScheduleLocked ? colors.textTertiary : colors.textSecondary}
          />
        </TouchableOpacity>
        {!isScheduleLocked && (
          <Text style={[styles.helperText, { color: colors.textTertiary }]}>
            Calculated from start + duration
          </Text>
        )}
        {isScheduleLocked && (
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Schedule cannot be changed for active challenges
          </Text>
        )}

        {showStartPicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="slide">
            <View style={styles.pickerModalOverlay}>
              <View style={[styles.pickerModalContent, { backgroundColor: colors.surface }]}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                    <Text style={[styles.pickerDoneText, { color: colors.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={dayjs(startDate).toDate()}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={handleStartDateChange}
                  themeVariant={colorScheme}
                />
              </View>
            </View>
          </Modal>
        )}
        {showStartPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={dayjs(startDate).toDate()}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleStartDateChange}
          />
        )}

        {showEndPicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="slide">
            <View style={styles.pickerModalOverlay}>
              <View style={[styles.pickerModalContent, { backgroundColor: colors.surface }]}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                    <Text style={[styles.pickerDoneText, { color: colors.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={dayjs(endDate).toDate()}
                  mode="date"
                  display="spinner"
                  minimumDate={dayjs(startDate).add(1, 'day').toDate()}
                  onChange={handleEndDateChange}
                  themeVariant={colorScheme}
                />
              </View>
            </View>
          </Modal>
        )}
        {showEndPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={dayjs(endDate).toDate()}
            mode="date"
            display="default"
            minimumDate={dayjs(startDate).add(1, 'day').toDate()}
            onChange={handleEndDateChange}
          />
        )}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Recurrence
        </Text>

        <View style={[styles.toggleRow, isRecurring && { marginBottom: 12 }]}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>
            Recurring Challenge
          </Text>
          <Toggle
            value={isRecurring}
            onValueChange={(val) => {
              setIsRecurring(val);
              if (val && recurrencePreset !== 'custom') {
                const presetDays = recurrencePreset === 'weekly' ? 7 : recurrencePreset === 'biweekly' ? 14 : 30;
                setDurationDays(String(presetDays));
                setEndDate(getChallengeEndDate(startDate, presetDays));
              }
            }}
            accessibilityLabel="Toggle recurring challenge"
            disabled={isScheduleLocked}
          />
        </View>

        {isRecurring && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Repeat Every</Text>
            <View style={styles.presetRow}>
              {([
                { key: 'weekly' as const, label: 'Weekly', days: 7 },
                { key: 'biweekly' as const, label: 'Biweekly', days: 14 },
                { key: 'monthly' as const, label: 'Monthly', days: 30 },
                { key: 'custom' as const, label: 'Custom', days: null },
              ]).map(({ key, label, days }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: recurrencePreset === key
                        ? (customThemeColor || CARD_GRADIENTS[themeColor]?.[0] || colors.primary)
                        : colors.surface,
                      borderColor: recurrencePreset === key
                        ? (customThemeColor || CARD_GRADIENTS[themeColor]?.[0] || colors.primary)
                        : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setRecurrencePreset(key);
                    if (days && !isScheduleLocked) {
                      setDurationDays(String(days));
                      setEndDate(getChallengeEndDate(startDate, days));
                    }
                  }}
                  disabled={isScheduleLocked}
                  accessibilityRole="button"
                  accessibilityState={{ selected: recurrencePreset === key }}
                >
                  <Text style={[
                    styles.presetChipText,
                    { color: recurrencePreset === key ? '#fff' : colors.text },
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Rest Period Between Cycles (days)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: isScheduleLocked ? colors.textTertiary : colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={gapDays}
              onChangeText={setGapDays}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              editable={!isScheduleLocked}
            />
            <Text style={[styles.helperText, { color: colors.textTertiary }]}>
              0 = next cycle starts immediately
            </Text>
          </>
        )}

        <Text style={[styles.label, { color: colors.text }]}>
          Daily Habits <Text style={{ color: colors.error }}>*</Text>
        </Text>
        {(isExpoGo || !NestableDraggableFlatList) ? (
          habits.map((habit, index) => (
            <View key={habit.id} style={styles.habitRow}>
              {habits.length > 1 && (
                <View style={styles.reorderButtons}>
                  <TouchableOpacity
                    onPress={() => moveHabit(index, 'up')}
                    hitSlop={14}
                    disabled={index === 0}
                    style={{ opacity: index === 0 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-up" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveHabit(index, 'down')}
                    hitSlop={14}
                    disabled={index === habits.length - 1}
                    style={{ opacity: index === habits.length - 1 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
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
                value={habit.text}
                onChangeText={text => {
                  updateHabit(habit.id, text);
                  if (errors.habits) setErrors(e => ({ ...e, habits: undefined }));
                }}
                onFocus={() => {
                  setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
                }}
                placeholder={`Habit ${index + 1}`}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
              />
              {habits.length > 1 && (
                <TouchableOpacity
                  style={styles.removeHabitButton}
                  onPress={() => removeHabit(habit.id)}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <NestableDraggableFlatList
            data={habits}
            keyExtractor={(item: HabitItem) => item.id}
            onDragEnd={({ data }: { data: HabitItem[] }) => setHabits(data)}
            scrollEnabled={false}
            renderItem={({ item: habit, drag, isActive, getIndex }: any) => {
              const index = getIndex() ?? 0;
              const content = (
                <View style={[styles.habitRow, isActive && styles.habitRowDragging]}>
                  {habits.length > 1 && (
                    <TouchableOpacity
                      onPressIn={drag}
                      disabled={isActive}
                      style={styles.dragHandle}
                      hitSlop={14}
                    >
                      <Ionicons name="reorder-three" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                  <TextInput
                    ref={(el: TextInput | null) => { habitInputRefs.current[index] = el; }}
                    style={[
                      styles.input,
                      styles.habitInput,
                      {
                        backgroundColor: colors.surface,
                        color: colors.text,
                        borderColor: errors.habits ? colors.error : colors.border,
                      },
                    ]}
                    value={habit.text}
                    onChangeText={(text: string) => {
                      updateHabit(habit.id, text);
                      if (errors.habits) setErrors(e => ({ ...e, habits: undefined }));
                    }}
                    onFocus={() => {
                      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
                    }}
                    placeholder={`Habit ${index + 1}`}
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                  />
                  {habits.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeHabitButton}
                      onPress={() => removeHabit(habit.id)}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              );
              return ScaleDecorator ? <ScaleDecorator>{content}</ScaleDecorator> : content;
            }}
          />
        )}
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

      </FormScrollView>

      <View style={[styles.fixedButtonContainer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: keyboardVisible ? 12 : TAB_BAR_HEIGHT + insets.bottom + 25 }]}>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary, marginBottom: 0, opacity: (isCreating || isUploadingBackground) ? 0.7 : 1 }]}
          onPress={handleCreate}
          disabled={isCreating || isUploadingBackground}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{isEditMode ? 'Save Changes' : 'Create Challenge'}</Text>
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
        <View style={styles.createModeContainer}>
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
        refreshControl={
          mode === 'browse' ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {mode === 'browse' && renderBrowse()}
        {mode === 'join' && renderJoin()}
      </ScrollView>
      <TabBarGradientFade />
      {mode === 'browse' && <HeaderChatButton />}
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
    paddingBottom: TAB_BAR_HEIGHT + 32,
  },
  createModeContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  browseHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    marginHorizontal: -20,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
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
    borderRadius: 12,
    overflow: 'hidden',
    gap: 8,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    width: '100%',
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
  browseIntro: {
    marginBottom: 20,
  },
  browseIntroTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  browseIntroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  wizardPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  wizardPromptCardText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
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
  helperText: {
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
  reorderButtons: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    gap: 2,
  },
  dragHandle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    paddingVertical: 4,
  },
  habitRowDragging: {
    opacity: 0.9,
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerModalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
  },
  categorySubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  categorySubHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  backgroundImagePicker: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    height: 140,
  },
  backgroundImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backgroundImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  backgroundImagePlaceholderText: {
    fontSize: 14,
  },
  backgroundImageUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
