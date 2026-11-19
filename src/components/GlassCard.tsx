import React from 'react';
import {View, StyleSheet, ViewStyle, Platform} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme/ThemeContext';
import {Radius, Shadow} from '../../theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  blurAmount?: number;
  borderRadius?: number;
  strong?: boolean;
  glow?: string;
  padding?: number;
}

/**
 * GlassCard — the foundational liquid-glass surface component.
 * Renders a frosted-glass card with dynamic blur, shimmer border,
 * and optional colored glow. Adapts seamlessly to light/dark mode.
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  blurAmount = 24,
  borderRadius = Radius.lg,
  strong = false,
  glow,
  padding = 16,
}) => {
  const {colors, isDark} = useTheme();

  const surface = strong ? colors.surfaceStrong : colors.surface;
  const border = strong ? colors.border : colors.borderSubtle;

  return (
    <View
      style={[
        styles.wrapper,
        {borderRadius},
        glow ? Shadow.glow(glow) : Shadow.md,
        style,
      ]}>
      {/* Blur layer — iOS uses BlurView, Android uses a semi-opaque tint */}
      {Platform.OS === 'ios' ? (
        <BlurView
          style={StyleSheet.absoluteFillObject}
          blurType={isDark ? 'dark' : 'light'}
          blurAmount={blurAmount}
          reducedTransparencyFallbackColor={surface}
        />
      ) : (
        <View
          style={[StyleSheet.absoluteFillObject, {backgroundColor: surface, borderRadius}]}
        />
      )}

      {/* Shimmer top-edge highlight */}
      <LinearGradient
        style={[styles.shimmer, {borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius}]}
        colors={[colors.shimmer, 'transparent']}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}
        pointerEvents="none"
      />

      {/* Border ring */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {borderRadius, borderWidth: 1, borderColor: border},
        ]}
        pointerEvents="none"
      />

      {/* Content */}
      <View style={{padding, borderRadius}}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    zIndex: 1,
  },
});
