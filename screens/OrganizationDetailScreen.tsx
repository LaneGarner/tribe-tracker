import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  assignOrganizationTeamMember,
  createOrganizationInvitation,
  createOrganizationTeam,
  getOrganizationMembers,
  getOrganizationReport,
  getOrganizationTeams,
  OrganizationRequestError,
  removeOrganizationMember,
} from '../services/organizations';
import {
  OrganizationMember,
  OrganizationReport,
  OrganizationTeam,
} from '../types/organization';

export default function OrganizationDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'OrganizationDetail'>>();
  const navigation = useNavigation<any>();
  const { organizationId, organizationName, roles } = route.params;
  const isOrganizationAdmin = roles.includes('organization_admin');
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { getAccessToken } = useAuth();
  const [teams, setTeams] = useState<OrganizationTeam[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [organizationMembers, setOrganizationMembers] = useState<
    OrganizationMember[]
  >([]);
  const [report, setReport] = useState<OrganizationReport | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [teamName, setTeamName] = useState('');
  const selectedTeam = teams.find(team => team.id === selectedTeamId);
  const canManageVisibleMembers =
    isOrganizationAdmin ||
    Boolean(selectedTeam?.roles.includes('team_manager'));

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const [nextTeams, nextOrganizationMembers] = await Promise.all([
        getOrganizationTeams(token, organizationId),
        isOrganizationAdmin
          ? getOrganizationMembers(token, organizationId)
          : Promise.resolve([]),
      ]);
      setTeams(nextTeams);
      setOrganizationMembers(nextOrganizationMembers);
      if (selectedTeamId) {
        try {
          const [nextMembers, nextReport] = await Promise.all([
            getOrganizationMembers(token, organizationId, selectedTeamId),
            getOrganizationReport(token, organizationId, selectedTeamId),
          ]);
          setMembers(nextMembers);
          setReport(nextReport);
          if (!isOrganizationAdmin) {
            setTeams(current =>
              current.map(team =>
                team.id === selectedTeamId
                  ? { ...team, roles: ['team_manager'] }
                  : team
              )
            );
          }
        } catch (error) {
          if (error instanceof OrganizationRequestError && error.status === 403) {
            setMembers([]);
            setReport(null);
          } else {
            throw error;
          }
        }
      } else if (isOrganizationAdmin) {
        setMembers(nextOrganizationMembers);
        setReport(null);
      } else {
        setMembers([]);
        setReport(null);
      }
    } catch (error) {
      Alert.alert('Unable to Load', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, isOrganizationAdmin, organizationId, selectedTeamId]);

  useEffect(() => {
    navigation.setOptions({ title: organizationName });
    load();
  }, [load, navigation, organizationName]);

  const shareJoinLink = async (teamId?: string) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const invitation = await createOrganizationInvitation(token, {
        organizationId,
        teamId,
      });
      if (invitation.joinUrl) await Share.share({ message: invitation.joinUrl });
      else Alert.alert('Invitation Created', 'The secure invitation is ready.');
    } catch (error) {
      Alert.alert('Unable to Invite', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const createTeam = async () => {
    const trimmedName = teamName.trim();
    const token = getAccessToken();
    if (!token || !trimmedName) return;
    setWorking(true);
    try {
      await createOrganizationTeam(token, organizationId, trimmedName);
      setTeamName('');
      await load();
      Alert.alert('Team Created', `${trimmedName} is ready.`);
    } catch (error) {
      Alert.alert(
        'Unable to Create Team',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setWorking(false);
    }
  };

  const setTeamRole = async (
    member: OrganizationMember,
    role: 'team_manager' | 'member'
  ) => {
    const token = getAccessToken();
    if (!token || !selectedTeamId) return;
    setWorking(true);
    try {
      await assignOrganizationTeamMember(token, {
        organizationId,
        teamId: selectedTeamId,
        membershipId: member.membershipId,
        role,
      });
      await load();
    } catch (error) {
      Alert.alert(
        'Unable to Update Team',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setWorking(false);
    }
  };

  const removeMember = (member: OrganizationMember) => {
    Alert.alert(
      'Remove Member?',
      selectedTeam
        ? `Remove ${member.name} from ${selectedTeam.name}?`
        : `Remove ${member.name} from ${organizationName}?`,
      [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const token = getAccessToken();
          if (!token) return;
          try {
            await removeOrganizationMember(
              token,
              organizationId,
              member.membershipId,
              selectedTeamId
            );
            await load();
          } catch (error) {
            Alert.alert('Unable to Remove', error instanceof Error ? error.message : 'Please try again.');
          }
        },
      },
      ]
    );
  };

  const availableMembers = selectedTeamId
    ? organizationMembers.filter(
        candidate =>
          !members.some(member => member.membershipId === candidate.membershipId)
      )
    : [];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      {isOrganizationAdmin ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.name, { color: colors.text }]}>Create a team</Text>
          <TextInput
            value={teamName}
            onChangeText={setTeamName}
            placeholder="Team name"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
          />
          <TouchableOpacity
            disabled={working || !teamName.trim()}
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary, opacity: teamName.trim() ? 1 : 0.5 },
            ]}
            onPress={createTeam}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Create team</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={[styles.heading, { color: colors.text }]}>Aggregate activity</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {!selectedTeamId ? (
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Select a team to view its privacy-protected participation summary.
          </Text>
        ) : !report ? (
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Aggregate reporting is available to that team’s manager.
          </Text>
        ) : report.suppressed ? (
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Results are hidden until at least {report.suppressionThreshold} distinct
            participants contribute.
          </Text>
        ) : (
          <Text style={[styles.body, { color: colors.text }]}>
            {report.participantCount ?? 0} of {report.eligibleMemberCount ?? 0}{' '}
            members participating · {report.challengeCount ?? 0} challenges ·{' '}
            {report.checkInCount ?? 0} check-ins
          </Text>
        )}
      </View>

      <Text style={[styles.heading, { color: colors.text }]}>Teams</Text>
      {teams.map(team => (
        <TouchableOpacity
          key={team.id}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor:
                selectedTeamId === team.id ? colors.primary : 'transparent',
              borderWidth: 1,
            },
          ]}
          onPress={() =>
            setSelectedTeamId(current => (current === team.id ? undefined : team.id))
          }
        >
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>{team.name}</Text>
              <Text style={[styles.caption, { color: colors.textSecondary }]}>
                {team.memberCount > 0 ? `${team.memberCount} members` : 'View team'}
              </Text>
            </View>
            {team.roles.includes('team_manager') || isOrganizationAdmin ? (
              <TouchableOpacity
                onPress={() => shareJoinLink(team.id)}
                accessibilityRole="button"
                accessibilityLabel={`Share a join link for ${team.name}`}
                accessibilityHint="Opens the system share sheet with a secure link"
                hitSlop={10}
              >
                <Ionicons name="person-add-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </TouchableOpacity>
      ))}

      {canManageVisibleMembers ? (
        <>
          <Text style={[styles.heading, { color: colors.text }]}>
            Invite {selectedTeam ? `to ${selectedTeam.name}` : 'to organization'}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Share a secure join link. Anyone with the link can sign in or create
              an account, then join {selectedTeam ? selectedTeam.name : organizationName}.
            </Text>
            <TouchableOpacity
              disabled={working}
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary, marginTop: 14 },
              ]}
              onPress={() => shareJoinLink(selectedTeamId)}
              accessibilityRole="button"
              accessibilityLabel={
                selectedTeam
                  ? `Share a join link for ${selectedTeam.name}`
                  : `Share a join link for ${organizationName}`
              }
              accessibilityHint="Opens the system share sheet with a secure link"
            >
              <Ionicons name="share-outline" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Share join link</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      <Text style={[styles.heading, { color: colors.text }]}>Members</Text>
      {members.map(member => (
        <View key={member.membershipId} style={[styles.card, styles.row, { backgroundColor: colors.surface }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>{member.name}</Text>
            <Text style={[styles.caption, { color: colors.textSecondary }]}>
              {(member.teamRole
                ? [member.teamRole]
                : member.roles
              ).map(role => role.replace(/_/g, ' ')).join(' · ')}
            </Text>
          </View>
          {isOrganizationAdmin && selectedTeamId ? (
            <TouchableOpacity
              disabled={working}
              style={styles.roleButton}
              onPress={() =>
                setTeamRole(
                  member,
                  member.teamRole === 'team_manager' ? 'member' : 'team_manager'
                )
              }
            >
              <Text style={[styles.roleButtonText, { color: colors.primary }]}>
                {member.teamRole === 'team_manager'
                  ? 'Revoke manager'
                  : 'Make manager'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {canManageVisibleMembers ? (
            <TouchableOpacity onPress={() => removeMember(member)}>
              <Ionicons name="remove-circle-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          ) : null}
        </View>
      ))}

      {isOrganizationAdmin && selectedTeamId && availableMembers.length > 0 ? (
        <>
          <Text style={[styles.heading, { color: colors.text }]}>
            Add an existing member
          </Text>
          {availableMembers.map(member => (
            <View
              key={member.membershipId}
              style={[styles.card, styles.row, { backgroundColor: colors.surface }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>
                  {member.name}
                </Text>
                <Text style={[styles.caption, { color: colors.textSecondary }]}>
                  Organization member
                </Text>
              </View>
              <TouchableOpacity
                disabled={working}
                onPress={() => setTeamRole(member, 'team_manager')}
              >
                <Text style={[styles.roleButtonText, { color: colors.primary }]}>
                  Add as manager
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  primaryButton: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', padding: 14 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 8 },
  heading: { fontSize: 18, fontWeight: '700', marginBottom: 10, marginTop: 24 },
  card: { borderRadius: 13, marginBottom: 10, padding: 15 },
  row: { alignItems: 'center', flexDirection: 'row' },
  name: { fontSize: 16, fontWeight: '700' },
  caption: { fontSize: 13, marginTop: 3, textTransform: 'capitalize' },
  body: { fontSize: 14, lineHeight: 20 },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  roleButton: { padding: 8 },
  roleButtonText: { fontSize: 13, fontWeight: '700' },
});
