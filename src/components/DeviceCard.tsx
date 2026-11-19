import React, {useRef, useEffect} from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {GlassCard} from './GlassCard';
import {useTheme} from '../../theme/ThemeContext';
import {Colors, Spacing, Typography, Radius} from '../../theme';
import {NearbyDevice} from '../../utils/types';
import {stringToColor, getInitials} from '../../utils/helpers';
import HapticFeedback from 'react-native-haptic-feedback';

interface DeviceCardProps {
  device: NearbyDevice;
  onPress: (device: NearbyDevice) => void;
  isSelected?: boolean;
}

const DEVICE_ICONS: Record<string, string> = {
  android: 'android',
  ios: 'phone-iphone',
  windows: 'computer',
  mac: 'laptop-mac',
  linux: 'computer',
  unknown: 'devices',
};

/**
 * DeviceCard — represents a discovered nearby device.
 * Shows avatar initials with branded color, device type icon,
 * platform badge, and a subtle signal-strength indicator.
 */
export const DeviceCard: React.FC<DeviceCardProps> = ({device, onPress, isSelected}) => {
  const {colors, isDark} = useTheme();
  const avatarColor = stringToColor(device.name);
  const scale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation when selected
  useEffect(() => {
    if (isSelected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {toValue: 1, duration: 900, useNativeDriver: true}),
          Animated.timing(glowAnim, {toValue: 0, duration: 900, useNativeDriver: true}),
        ]),
      ).start();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
    }
  }, [isSelected, glowAnim]);

  const glowOpacity = glowAnim.interpolate({inputRange: [0, 1], outputRange: [0.3, 0.8]});

  const handlePress = () => {
    HapticFeedback.trigger('impactMedium', {enableVibrateFallback: true});
    Animated.sequence([
      Animated.spring(scale, {toValue: 0.93, useNativeDriver: true, damping: 10, stiffness: 300}),
      Animated.spring(scale, {toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200}),
    ]).start();
    onPress(device);
  };

  return (
    <Animated.View style={{transform: [{scale}]}}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
        <GlassCard
          borderRadius={Radius.xl}
          padding={Spacing.lg}
          strong={isSelected}
          glow={isSelected ? avatarColor : undefined}
          style={styles.card}>

          {/* Selection glow ring */}
          {isSelected && (
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  borderRadius: Radius.xl,
                  borderWidth: 2,
                  borderColor: avatarColor,
                  opacity: glowOpacity,
                },
              ]}
            />
          )}

          {/* Avatar */}
          <LinearGradient
            colors={[avatarColor, `${avatarColor}88`]}
            style={styles.avatar}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}>
            <Text style={styles.initials}>{getInitials(device.name)}</Text>
          </LinearGradient>

          {/* Device icon badge */}
          <View style={[styles.badge, {backgroundColor: colors.surfaceStrong}]}>
            <Icon
              name={DEVICE_ICONS[device.deviceType] ?? 'devices'}
              size={12}
              color={avatarColor}
            />
          </View>

          {/* Info */}
          <Text style={[styles.name, {color: colors.text.primary}]} numberOfLines={1}>
            {device.name}
          </Text>
          <Text style={[styles.meta, {color: colors.text.tertiary}]}>
            {device.platform} · {device.connectionMethod.replace('_', ' ')}
          </Text>

          {/* Signal dots */}
          <View style={styles.signal}>
            {[1, 2, 3].map(i => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    height: 4 + i * 3,
                    backgroundColor: i <= 2 ? avatarColor : colors.border,
                  },
                ]}
              />
            ))}
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 130,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: 54,
    right: 32,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...Typography.headingSmall,
    color: '#fff',
  },
  name: {
    ...Typography.labelLarge,
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 100,
  },
  meta: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  signal: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginTop: Spacing.sm,
  },
  dot: {
    width: 4,
    borderRadius: 2,
  },
});
