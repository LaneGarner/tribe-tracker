import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';

export function triggerLightFeedback(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      Vibration.vibrate(10);
    });
  } catch {
    Vibration.vibrate(10);
  }
}
