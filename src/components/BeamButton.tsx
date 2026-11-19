import React, {useRef, useEffect} from 'react';
import {
  TouchableOpacity, Animated, StyleSheet, Text, ViewStyle, TextStyle, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import HapticFeedback from 'react-native-haptic-feedback';
import {Colors, Radius, Typography, Shadow} from '../theme';

interface BeamButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const GRADIENTS = {
  primary: Colors.brand.primary,
  secondary: Colors.brand.secondary,
  danger: Colors.brand.danger,
  ghost: ['transparent', 'transparent'],
};

/**
 * BeamButton — glass-accented CTA button with spring press animation
 * and haptic feedback. Uses gradient fills for primary actions and
 * ghost variant for secondary actions.
 */
export const BeamButton: React.FC<BeamButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  style,
  fullWidth = false,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    HapticFeedback.trigger('impactLight', {enableVibrateFallback: true});
    Animated.parallel([
      Animated.spring(scale, {toValue: 0.95, useNativeDriver: true, ...springConfig}),
      Animated.timing(opacity, {toValue: 0.85, duration: 80, useNativeDriver: true}),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {toValue: 1, useNativeDriver: true, ...springConfig}),
      Animated.timing(opacity, {toValue: 1, duration: 100, useNativeDriver: true}),
    ]).start();
  };

  const heights = {sm: 38, md: 48, lg: 58};
  const pads = {sm: 14, md: 20, lg: 28};
  const textStyles: Record<string, TextStyle> = {
    sm: Typography.labelMedium,
    md: Typography.labelLarge,
    lg: {...Typography.labelLarge, fontSize: 16},
  };

  const isGhost = variant === 'ghost';

  return (
    <Animated.View style={{transform: [{scale}], opacity, alignSelf: fullWidth ? 'stretch' : 'auto'}}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
        style={[fullWidth && styles.fullWidth, style]}>
        {isGhost ? (
          <Animated.View
            style={[
              styles.ghostBase,
              {height: heights[size], paddingHorizontal: pads[size]},
              disabled && styles.disabled,
            ]}>
            {icon && <Animated.View style={styles.iconWrap}>{icon}</Animated.View>}
            <Text style={[textStyles[size], styles.ghostText]}>{label}</Text>
          </Animated.View>
        ) : (
          <LinearGradient
            colors={disabled ? ['#555', '#444'] : GRADIENTS[variant]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={[
              styles.gradBase,
              {height: heights[size], paddingHorizontal: pads[size], borderRadius: Radius.full},
              !disabled && Shadow.glow(GRADIENTS[variant][0]),
            ]}>
            {icon && <Animated.View style={styles.iconWrap}>{icon}</Animated.View>}
            <Text style={[textStyles[size], styles.gradText]}>{label}</Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const springConfig = {damping: 15, stiffness: 300, mass: 0.8};

const styles = StyleSheet.create({
  fullWidth: {alignSelf: 'stretch'},
  gradBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ghostBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(140,140,255,0.4)',
    backgroundColor: 'rgba(100,100,255,0.08)',
  },
  iconWrap: {marginRight: 8},
  gradText: {color: '#fff', letterSpacing: 0.5},
  ghostText: {color: 'rgba(180,180,255,0.9)', letterSpacing: 0.5},
  disabled: {opacity: 0.4},
});
