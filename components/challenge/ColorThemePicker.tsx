import React, { useContext, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { CARD_GRADIENTS, darkenHex, isValidHex } from '../../constants/gradients';

interface ColorThemePickerProps {
  selectedIndex: number | null;
  customColor: string | null;
  onSelectPreset: (index: number) => void;
  onSelectCustom: (hex: string) => void;
}

export default function ColorThemePicker({
  selectedIndex,
  customColor,
  onSelectPreset,
  onSelectCustom,
}: ColorThemePickerProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const [showCustomInput, setShowCustomInput] = useState(Boolean(customColor));
  const [hexInput, setHexInput] = useState(customColor || '#');

  const isCustomActive = customColor !== null && isValidHex(customColor);

  const handlePresetPress = (index: number) => {
    onSelectPreset(index);
    setShowCustomInput(false);
  };

  const handleCustomPress = () => {
    setShowCustomInput(true);
    if (isValidHex(hexInput)) {
      onSelectCustom(hexInput);
    }
  };

  const handleHexChange = (text: string) => {
    let value = text;
    if (!value.startsWith('#')) {
      value = '#' + value.replace(/#/g, '');
    }
    value = value.slice(0, 7);
    setHexInput(value);
    if (isValidHex(value)) {
      onSelectCustom(value);
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={styles.swatchRow}
        accessibilityRole="radiogroup"
        accessibilityLabel="Color theme options"
      >
        {CARD_GRADIENTS.map((gradient, index) => {
          const isSelected = selectedIndex === index && !isCustomActive;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.swatchOuter, isSelected && styles.swatchSelected]}
              onPress={() => handlePresetPress(index)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`Color theme ${index + 1}`}
              hitSlop={4}
            >
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.swatchGradient}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}

        {/* Custom color swatch */}
        <TouchableOpacity
          style={[
            styles.swatchOuter,
            isCustomActive && styles.swatchSelected,
          ]}
          onPress={handleCustomPress}
          activeOpacity={0.7}
          accessibilityRole="radio"
          accessibilityState={{ checked: isCustomActive }}
          accessibilityLabel="Custom color theme"
          hitSlop={4}
        >
          {isCustomActive ? (
            <LinearGradient
              colors={[customColor!, darkenHex(customColor!)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.swatchGradient}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.swatchGradient,
                {
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="add" size={20} color={colors.textSecondary} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {showCustomInput && (
        <View style={styles.customInputRow}>
          <TextInput
            style={[
              styles.hexInput,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: isValidHex(hexInput) ? colors.border : colors.error,
              },
            ]}
            value={hexInput}
            onChangeText={handleHexChange}
            placeholder="#FF5733"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
            maxLength={7}
            autoCorrect={false}
          />
          {isValidHex(hexInput) && (
            <LinearGradient
              colors={[hexInput, darkenHex(hexInput)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.previewSwatch}
            />
          )}
        </View>
      )}
    </View>
  );
}

const SWATCH_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatchOuter: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  swatchGradient: {
    flex: 1,
    borderRadius: (SWATCH_SIZE - 6) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  hexInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 1,
    width: 120,
  },
  previewSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
