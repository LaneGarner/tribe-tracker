import { Alert, Linking } from 'react-native';

export async function openExternalLink(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      'Unable to Open Link',
      'Please try again later or contact InfoTribeTracker@gmail.com.'
    );
  }
}

