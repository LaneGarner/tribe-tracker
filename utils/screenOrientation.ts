import * as ScreenOrientation from 'expo-screen-orientation';

export async function lockPortraitOrientation(): Promise<void> {
  await ScreenOrientation.lockAsync(
    ScreenOrientation.OrientationLock.PORTRAIT_UP
  );
}
