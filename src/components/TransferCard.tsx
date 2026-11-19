import React, {useRef} from 'react';
import {View, Text, StyleSheet, Animated, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {GlassCard} from './GlassCard';
import {useTheme} from '../theme/ThemeContext';
import {Colors, Spacing, Typography, Radius} from '../theme';
import {Transfer} from '../utils/types';
import {
  formatBytes, formatSpeed, formatETA, getProgress,
  getCategoryGradient, getCategoryIcon, getFileCategory,
} from '../utils/helpers';

interface TransferCardProps {
  transfer: Transfer;
  onCancel?: () => void;
  onDismiss?: () => void;
}

const STATUS_COLORS = {
  idle: '#94A3B8',
  pending: '#FBBF24',
  connecting: '#06B6D4',
  transferring: '#6C63FF',
  paused: '#F59E0B',
  completed: '#34D399',
  failed: '#EF4444',
  cancelled: '#64748B',
};

/**
 * TransferCard — shows live transfer progress with animated progress bar,
 * speed/ETA labels, and file type gradients. Collapses to a compact
 * completed/failed state when done.
 */
export const TransferCard: React.FC<TransferCardProps> = ({transfer, onCancel, onDismiss}) => {
  const {colors} = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;

  const progress = getProgress(transfer.transferredBytes, transfer.totalBytes);
  const statusColor = STATUS_COLORS[transfer.status];
  const isActive = transfer.status === 'transferring' || transfer.status === 'connecting';
  const isDone = transfer.status === 'completed' || transfer.status === 'failed' || transfer.status === 'cancelled';

  // Animate progress bar
  Animated.timing(progressAnim, {
    toValue: progress,
    duration: 300,
    useNativeDriver: false,
  }).start();

  const firstFile = transfer.files[0];
  const category = firstFile
    ? getFileCategory(firstFile.mimeType, firstFile.name)
    : 'other';
  const catGradient = getCategoryGradient(category);
  const catIcon = getCategoryIcon(category);

  const fileLabel =
    transfer.files.length === 1
      ? firstFile?.name ?? 'File'
      : `${transfer.files.length} items`;

  const remaining = transfer.totalBytes - transfer.transferredBytes;
  const eta = formatETA(remaining, transfer.speed);

  return (
    <GlassCard style={styles.card} borderRadius={Radius.xl} padding={0}>
      {/* Header */}
      <View style={styles.header}>
        {/* File type icon */}
        <LinearGradient colors={catGradient} style={styles.iconBox} start={{x:0,y:0}} end={{x:1,y:1}}>
          <Icon name={catIcon} size={22} color="#fff" />
        </LinearGradient>

        <View style={styles.headerInfo}>
          <Text style={[styles.fileName, {color: colors.text.primary}]} numberOfLines={1}>
            {fileLabel}
          </Text>
          <View style={styles.row}>
            <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
            <Text style={[styles.statusText, {color: statusColor}]}>
              {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
            </Text>
            <Text style={[styles.meta, {color: colors.text.tertiary}]}>
              {' '}· {transfer.direction === 'send' ? '↑' : '↓'} {transfer.device.name}
            </Text>
          </View>
        </View>

        {/* Action button */}
        {isActive && onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Icon name="close" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
        {isDone && onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.cancelBtn}>
            <Icon name="check" size={18} color={statusColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, {backgroundColor: colors.surfaceSubtle}]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}>
          <LinearGradient
            colors={isActive ? Colors.brand.primary : (transfer.status === 'completed' ? Colors.brand.success : ['#555','#444'])}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </View>

      {/* Stats row */}
      <View style={styles.stats}>
        <Text style={[styles.meta, {color: colors.text.tertiary}]}>
          {formatBytes(transfer.transferredBytes)} / {formatBytes(transfer.totalBytes)}
        </Text>
        {isActive && (
          <>
            <Text style={[styles.meta, {color: colors.text.tertiary}]}>
              {formatSpeed(transfer.speed)}
            </Text>
            <Text style={[styles.meta, {color: colors.text.tertiary}]}>{eta}</Text>
          </>
        )}
        {transfer.status === 'completed' && transfer.savePath && (
          <Text style={[styles.meta, {color: '#34D399'}]} numberOfLines={1}>
            Saved ✓
          </Text>
        )}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {overflow: 'hidden'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerInfo: {flex: 1},
  fileName: {...Typography.headingSmall},
  row: {flexDirection: 'row', alignItems: 'center', marginTop: 2},
  statusDot: {width: 7, height: 7, borderRadius: 4, marginRight: 5},
  statusText: {...Typography.labelSmall},
  meta: {...Typography.bodySmall, marginRight: Spacing.sm},
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(100,100,120,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    marginHorizontal: Spacing.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
