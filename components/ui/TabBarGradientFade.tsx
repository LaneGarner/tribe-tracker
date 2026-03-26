import { useContext } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { TAB_BAR_HEIGHT } from '../../constants/layout';

type TabBarGradientFadeProps = {
  backgroundColor?: string;
};

export function TabBarGradientFade({ backgroundColor }: TabBarGradientFadeProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const bg = backgroundColor ?? (colorScheme === 'dark' ? '#000' : '#fff');
  const useDark = colorScheme === 'dark' || backgroundColor === '#000';

  return (
    <LinearGradient
      colors={[useDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)', bg]}
      locations={[0, 1]}
      style={styles.gradient}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
});
