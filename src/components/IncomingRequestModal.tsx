import React, {useEffect, useRef} from 'react';
import {
  View, Text, StyleSheet, Modal, Animated, TouchableOpacity, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {GlassCard} from './GlassCard';
import {BeamButton} from './BeamButton';
import {useTheme} from '../../theme/ThemeContext';
import {Colors, Spacing, Typography, Radius} from '../../theme';
import {Transfer} from '../../utils/types';
import {formatBytes, getInitials, stringToColor} from '../../utils/helpers';

interface IncomingRequestModalProps {
  transfer: Transfer | null;
  onAccept: () => void;
  onReject: () => void;
}

const {width} = Dimensions.get('window');

/**
 * IncomingRequestModal — bottom-sheet style incoming transfer request dialog.
 * Shows sender info, file count/size, and Accept/Decline CTAs.
 * Slides up from bottom with spring animation.
 */
export const IncomingRequestModal: React.FC<IncomingRequestModalProps> = ({
  transfer,
  onAccept,
  onReject,
}) => {
  const {colors} = useTheme();
  const translateY = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const visible = !!transfer;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 180,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {toValue: 400, duration: 280, useNativeDriver: true}),
        Animated.timing(backdropOpacity, {toValue: 0, duration: 200, useNativeDriver: true}),
      ]).start();
    }
  }, [visible]);

  if (!transfer) return null;

  const avatarColor = stringToColor(transfer.device.name);
  const totalBytes = transfer.totalBytes;
  const fileCount = transfer.files.length;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, {opacity: backdropOpacity}]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onReject} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, {transform: [{translateY}]}]}>
        <GlassCard strong borderRadius={Radius.xl} padding={0} style={styles.card}>
          {/* Drag handle */}
          <View style={[styles.handle, {backgroundColor: colors.border}]} />

          {/* Header gradient stripe */}
          <LinearGradient
            colors={[`${avatarColor}33`, 'transparent']}
            style={styles.stripe}
          />

          <View style={styles.body}>
            {/* Sender avatar */}
            <LinearGradient
              colors={[avatarColor, `${avatarColor}88`]}
              style={styles.avatar}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}>
              <Text style={styles.initials}>{getInitials(transfer.device.name)}</Text>
            </LinearGradient>

            <Text style={[styles.title, {color: colors.text.primary}]}>
              Incoming Beam
            </Text>
            <Text style={[styles.sender, {color: avatarColor}]}>
              {transfer.device.name}
            </Text>
            <Text style={[styles.subtitle, {color: colors.text.secondary}]}>
              wants to send you
            </Text>

            {/* File summary pill */}
            <View style={[styles.pill, {backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle}]}>
              <Icon name="folder-open" size={16} color={avatarColor} style={{marginRight: 6}} />
              <Text style={[styles.pillText, {color: colors.text.primary}]}>
                {fileCount === 1 ? transfer.files[0]?.name : `${fileCount} files`}
              </Text>
              <View style={[styles.pillDivider, {backgroundColor: colors.border}]} />
              <Text style={[styles.pillMeta, {color: colors.text.tertiary}]}>
                {formatBytes(totalBytes)}
              </Text>
            </View>

            {/* File list preview (up to 3) */}
            {transfer.files.slice(0, 3).map((f, i) => (
              <View key={f.id} style={[styles.fileRow, {borderTopColor: colors.borderSubtle, borderTopWidth: i === 0 ? 1 : 0}]}>
                <Icon name="insert-drive-file" size={15} color={colors.text.tertiary} />
                <Text style={[styles.fileName, {color: colors.text.secondary}]} numberOfLines={1}>
                  {f.name}
                </Text>
                <Text style={[styles.fileSize, {color: colors.text.tertiary}]}>
                  {formatBytes(f.size)}
                </Text>
              </View>
            ))}
            {fileCount > 3 && (
              <Text style={[styles.moreFiles, {color: colors.text.tertiary}]}>
                +{fileCount - 3} more files
              </Text>
            )}

            {/* Action buttons */}
            <View style={styles.actions}>
              <BeamButton
                label="Decline"
                variant="ghost"
                onPress={onReject}
                style={styles.actionBtn}
              />
              <BeamButton
                label="Accept"
                variant="primary"
                onPress={onAccept}
                style={styles.actionBtn}
                fullWidth
              />
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  card: {borderBottomLeftRadius: 0, borderBottomRightRadius: 0},
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
  },
  stripe: {height: 80, marginTop: -Spacing.md},
  body: {paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl},
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginTop: -24,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  initials: {...Typography.headingLarge, color: '#fff'},
  title: {...Typography.headingMedium, textAlign: 'center', marginTop: Spacing.lg},
  sender: {...Typography.headingSmall, textAlign: 'center', marginTop: 2},
  subtitle: {...Typography.bodyLarge, textAlign: 'center', marginBottom: Spacing.lg},
  pill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.full, borderWidth: 1,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  pillText: {...Typography.labelLarge},
  pillDivider: {width: 1, height: 14, marginHorizontal: Spacing.sm},
  pillMeta: {...Typography.bodySmall},
  fileRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, gap: Spacing.sm,
  },
  fileName: {...Typography.bodyMedium, flex: 1},
  fileSize: {...Typography.bodySmall},
  moreFiles: {...Typography.bodySmall, textAlign: 'center', marginTop: Spacing.sm},
  actions: {flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl},
  actionBtn: {flex: 1},
});
