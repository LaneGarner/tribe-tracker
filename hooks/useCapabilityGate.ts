import { useNavigation } from '@react-navigation/native';
import { useMembership } from '../context/MembershipContext';
import { MembershipCapability } from '../types/membership';

export function useCapabilityGate() {
  const navigation = useNavigation<any>();
  const { membership, isLoading } = useMembership();

  const hasCapability = (capability: MembershipCapability) =>
    Boolean(membership.capabilities[capability]);

  const requireCapability = (
    capability: MembershipCapability,
    onAllowed: () => void
  ) => {
    if (hasCapability(capability)) {
      onAllowed();
      return true;
    }
    navigation.navigate('Paywall', { feature: capability });
    return false;
  };

  return { hasCapability, requireCapability, isLoading };
}
