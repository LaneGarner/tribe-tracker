# Tribe Tracker Design Guide

## Typography

### Brand Font
**Rajdhani** - A geometric, athletic typeface with a tech-forward feel. Perfect for a competitive habit tracking app.

```typescript
// Available weights (loaded in App.tsx)
import { Rajdhani_700Bold } from '@expo-google-fonts/rajdhani';

// Usage in styles
fontFamily: 'Rajdhani_700Bold'
```

### Typography Scale
| Use Case | Font | Size | Weight | Letter Spacing |
|----------|------|------|--------|----------------|
| Brand/Logo | Rajdhani | 18 | 700 | 1 |
| Screen Titles | System | 28 | Bold | 0 |
| Section Headers | System | 18 | 600 | 0 |
| Body | System | 16 | 400 | 0 |
| Caption | System | 14 | 400 | 0 |
| Small | System | 12 | 400 | 0 |

### Adding New Fonts
```bash
npx expo install @expo-google-fonts/[font-name]
```

Then in App.tsx:
```typescript
import { FontName_Weight } from '@expo-google-fonts/font-name';

const [fontsLoaded] = useFonts({
  FontName_Weight,
});
```

## Color Palette

Colors are defined in `theme/ThemeContext.tsx` and accessed via:
```typescript
const { colorScheme } = useContext(ThemeContext);
const colors = getColors(colorScheme);
```

### Core Colors
- **Primary**: Blue (#3B82F6 light / #60A5FA dark) - Actions, links, emphasis
- **Success**: Green - Completed states, positive feedback
- **Warning**: Amber - Streaks, caution states
- **Error**: Red - Destructive actions, errors

### Surface Hierarchy
- **Background**: Base canvas
- **Surface**: Cards, elevated elements
- **SurfaceSecondary**: Nested elements, avatars

## Motion & Animation

### Principles
1. **Purpose over decoration** - Animation should guide attention
2. **Quick and responsive** - 200-300ms for micro-interactions
3. **Staggered reveals** - Use delays for list items (50ms increments)

### Common Patterns
```typescript
// Fade in with slight rise
Animated.parallel([
  Animated.timing(opacity, { toValue: 1, duration: 300 }),
  Animated.timing(translateY, { toValue: 0, duration: 300 }),
])

// Staggered list items
items.map((item, i) => (
  <Animated.View style={{ animationDelay: i * 50 }} />
))
```

## Component Patterns

### Cards
- Border radius: 12px
- Padding: 16px
- Background: colors.surface
- No borders, use elevation/shadow sparingly

### Buttons
- Primary: Filled with colors.primary, white text
- Secondary: Surface background, text color
- Border radius: 12px
- Padding: 16px vertical

### Icons
- Size: 20-24px for actions, 48-64px for empty states
- Use Ionicons (outline variants for inactive, filled for active)

## Avoiding "AI Slop"

### Do
- Use the brand font (Rajdhani) for key UI elements
- Commit to the sporty/competitive aesthetic
- Use bold accent colors sparingly but confidently
- Create depth with subtle surface layering

### Don't
- Fall back to system fonts for brand elements
- Use generic purple gradients
- Over-animate everything
- Use identical spacing/sizing throughout
