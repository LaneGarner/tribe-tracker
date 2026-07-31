import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  acceptOrganizationInvite,
  getOrganizationInvite,
} from '../services/organizations';
import { OrganizationSummary, OrganizationTeam } from '../types/organization';

export default function OrganizationInviteScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'OrganizationInvite'>>();
  const navigation = useNavigation<any>();
  const { token } = route.params;
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { getAccessToken } = useAuth();
  const [organization, setOrganization] = useState<OrganizationSummary | null>(null);
  const [team, setTeam] = useState<OrganizationTeam | undefined>();
  const [challenge, setChallenge] = useState<{ id: string; name: string; inviteCode?: string } | undefined>();
  const [adultAttested, setAdultAttested] = useState(false);
  const [working, setWorking] = useState(true);

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) return;
    getOrganizationInvite(accessToken, token)
      .then(value => {
        setOrganization(value.organization);
        setTeam(value.team);
        setChallenge(value.challenge);
      })
      .catch(error =>
        Alert.alert('Invalid Invitation', error instanceof Error ? error.message : 'This invitation cannot be used.')
      )
      .finally(() => setWorking(false));
  }, [getAccessToken, token]);

  const accept = async () => {
    const accessToken = getAccessToken();
    if (!accessToken || !adultAttested) return;
    setWorking(true);
    try {
      await acceptOrganizationInvite(accessToken, token);
      Alert.alert('Welcome', `You joined ${organization?.name || 'the organization'}.`, [
        {
          text: challenge ? 'Continue to challenge' : 'Continue',
          onPress: () => challenge?.inviteCode
            ? navigation.replace('CreateChallenge', { mode: 'join', inviteCode: challenge.inviteCode })
            : challenge
              ? navigation.replace('ChallengeDetail', { challengeId: challenge.id })
              : navigation.replace('Organizations'),
        },
      ]);
    } catch (error) {
      Alert.alert('Unable to Join', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setWorking(false);
    }
  };

  if (working && !organization) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Ionicons name="people-outline" size={44} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>
        Join {challenge?.name || team?.name || organization?.name || 'organization'}
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {challenge
          ? `This link adds you as a regular member of ${team?.name || organization?.name || 'the organization'} and then takes you to the challenge. It does not grant manager access.`
          : 'This invitation adds you as a regular organization member. Sponsored Pro may be available while your membership is active.'}
      </Text>
      <TouchableOpacity
        style={styles.attestation}
        onPress={() => setAdultAttested(value => !value)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: adultAttested }}
      >
        <Ionicons name={adultAttested ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
        <Text style={[styles.attestationText, { color: colors.text }]}>
          I confirm I am an eligible adult participant.
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={!adultAttested || working}
        style={[styles.button, { backgroundColor: colors.primary, opacity: adultAttested ? 1 : 0.5 }]}
        onPress={accept}
      >
        <Text style={styles.buttonText}>{working ? 'Joining…' : 'Accept Invitation'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 },
  title: { fontSize: 25, fontWeight: '800', marginTop: 14, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, marginTop: 12, textAlign: 'center' },
  attestation: { alignItems: 'center', flexDirection: 'row', marginTop: 24 },
  attestationText: { flex: 1, fontSize: 14, lineHeight: 20, marginLeft: 10 },
  button: { borderRadius: 12, marginTop: 22, paddingHorizontal: 24, paddingVertical: 14 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
