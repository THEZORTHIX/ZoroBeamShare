import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, FlatList, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DocumentPicker from 'react-native-document-picker';
import LinearGradient from 'react-native-linear-gradient';

import {AmbientBackground} from '../components/AmbientBackground';
import {GlassCard} from '../components/GlassCard';
import {DeviceCard} from '../components/DeviceCard';
import {TransferCard} from '../components/TransferCard';
import {IncomingRequestModal} from '../components/IncomingRequestModal';
import {BeamButton} from '../components/BeamButton';

import {useTheme} from '../theme/ThemeContext';
import {Colors, Spacing, Typography, Radius, Shadow} from '../theme';
import {useApp} from '../store/AppContext';
import {NearbyDevice, TransferFile} from '../utils/types';
import {getFileCategory, formatBytes} from '../utils/helpers';

/**
 * HomeScreen — the main hub.
 * Sections:
 *   1. Radar / discovery ring with live device cards
 *   2. Active transfers strip
 *   3. Quick-send panel (file picker + clipboard)
 */
const HomeScreen: React.FC = () => {
  const {colors, isDark} = useTheme();
  const {state, startDiscovery, stopDiscovery, sendFiles, sendClipboard,
         acceptTransfer, rejectTransfer, cancelTransfer} = useApp();

  const [selectedDevice, setSelectedDevice] = useState<NearbyDevice | null>(null);
  const [pickedFiles, setPickedFiles] = useState<TransferFile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Radar ring animation
  const radarScale = useRef(new Animated.Value(1)).current;
  const radarOpacity = useRef(new Animated.Value(0.6)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.spring(headerSlide, {toValue: 0, damping: 20, stiffness: 150, useNativeDriver: true}),
      Animated.timing(headerOpacity, {toValue: 1, duration: 400, useNativeDriver: true}),
    ]).start();

    // Start discovery on mount
    startDiscovery();
    return () => stopDiscovery();
  }, []);

  // Radar pulse when discovering
  useEffect(() => {
    if (state.isDiscovering) {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(radarScale, {toValue: 1.15, duration: 1800, useNativeDriver: true}),
            Animated.timing(radarOpacity, {toValue: 0.1, duration: 1800, useNativeDriver: true}),
          ]),
          Animated.parallel([
            Animated.timing(radarScale, {toValue: 1, duration: 1800, useNativeDriver: true}),
            Animated.timing(radarOpacity, {toValue: 0.6, duration: 1800, useNativeDriver: true}),
          ]),
        ]),
      ).start();
    } else {
      radarScale.setValue(1);
      radarOpacity.setValue(0.4);
    }
  }, [state.isDiscovering]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    stopDiscovery();
    await startDiscovery();
    setTimeout(() => setRefreshing(false), 1200);
  }, [startDiscovery, stopDiscovery]);

  const pickFiles = useCallback(async () => {
    if (!selectedDevice) return;
    try {
      const results = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: DocumentPicker.types.allFiles,
        copyTo: 'cachesDirectory',
      });
      const files: TransferFile[] = results.map(r => ({
        id: `${Date.now()}-${Math.random()}`,
        name: r.name ?? 'file',
        path: r.fileCopyUri ?? r.uri,
        size: r.size ?? 0,
        mimeType: r.type ?? 'application/octet-stream',
        category: getFileCategory(r.type ?? '', r.name ?? ''),
        isFolder: false,
      }));
      setPickedFiles(files);
    } catch (e) {
      if (!DocumentPicker.isCancel(e)) console.warn('Picker error:', e);
    }
  }, [selectedDevice]);

  const handleSend = useCallback(async () => {
    if (!selectedDevice || pickedFiles.length === 0) return;
    await sendFiles(selectedDevice, pickedFiles);
    setPickedFiles([]);
  }, [selectedDevice, pickedFiles, sendFiles]);

  const activeTransfers = state.activeTransfers.filter(
    t => t.status === 'transferring' || t.status === 'connecting' || t.status === 'pending',
  );
  const recentCompleted = state.activeTransfers.filter(
    t => t.status === 'completed' || t.status === 'failed',
  ).slice(0, 2);

  return (
    <View style={styles.container}>
      <AmbientBackground isDark={isDark} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.brand.primary[0]}
          />
        }>

        {/* ── Header ───────────────────────────────────────────────── */}
        <Animated.View style={[styles.header, {opacity: headerOpacity, transform: [{translateY: headerSlide}]}]}>
          <View>
            <Text style={[styles.appName, {color: colors.text.primary}]}>ZoroBeam</Text>
            <Text style={[styles.appSub, {color: colors.text.tertiary}]}>
              {state.isDiscovering
                ? `Scanning · ${state.devices.length} device${state.devices.length !== 1 ? 's' : ''} nearby`
                : 'Tap to start scanning'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsBtn, {backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle}]}>
            <Icon name="settings" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Radar ring ─────────────────────────────────────────────── */}
        <View style={styles.radarWrap}>
          {/* Outer pulse rings */}
          {[1, 2, 3].map(i => (
            <Animated.View
              key={i}
              style={[
                styles.radarRing,
                {
                  width: 90 + i * 70,
                  height: 90 + i * 70,
                  borderRadius: (90 + i * 70) / 2,
                  borderColor: `${Colors.brand.primary[0]}${i === 1 ? '40' : i === 2 ? '25' : '12'}`,
                  transform: [{scale: i === 1 ? radarScale : 1}],
                  opacity: i === 1 ? radarOpacity : 0.3,
                },
              ]}
            />
          ))}

          {/* Center beacon button */}
          <TouchableOpacity onPress={state.isDiscovering ? stopDiscovery : startDiscovery}>
            <LinearGradient
              colors={state.isDiscovering ? Colors.brand.primary : ['#333', '#222']}
              style={styles.beaconBtn}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}>
              <Icon
                name={state.isDiscovering ? 'wifi-tethering' : 'wifi-tethering-off'}
                size={36}
                color="#fff"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Nearby devices ────────────────────────────────────────── */}
        {state.devices.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.text.secondary}]}>NEARBY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deviceRow}>
              {state.devices.map(device => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  isSelected={selectedDevice?.id === device.id}
                  onPress={d => setSelectedDevice(prev => prev?.id === d.id ? null : d)}
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <GlassCard style={styles.emptyCard} borderRadius={Radius.xl}>
            <Icon name="radar" size={40} color={colors.text.tertiary} style={{alignSelf: 'center'}} />
            <Text style={[styles.emptyTitle, {color: colors.text.secondary}]}>No devices found</Text>
            <Text style={[styles.emptyMeta, {color: colors.text.tertiary}]}>
              Make sure other devices have ZoroBeam open and are on the same Wi-Fi network
            </Text>
          </GlassCard>
        )}

        {/* ── Send panel (visible when device is selected) ─────────── */}
        {selectedDevice && (
          <GlassCard style={styles.sendPanel} borderRadius={Radius.xl} strong glow={Colors.brand.primary[0]}>
            <View style={styles.sendHeader}>
              <Icon name="send" size={18} color={Colors.brand.primary[0]} />
              <Text style={[styles.sendTitle, {color: colors.text.primary}]}>
                Send to {selectedDevice.name}
              </Text>
            </View>

            {/* Picked files preview */}
            {pickedFiles.length > 0 && (
              <View style={[styles.filePreview, {borderColor: colors.borderSubtle}]}>
                {pickedFiles.slice(0, 3).map(f => (
                  <View key={f.id} style={styles.filePreviewRow}>
                    <Icon name="insert-drive-file" size={14} color={Colors.brand.primary[0]} />
                    <Text style={[styles.filePreviewName, {color: colors.text.primary}]} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text style={[styles.filePreviewSize, {color: colors.text.tertiary}]}>
                      {formatBytes(f.size)}
                    </Text>
                  </View>
                ))}
                {pickedFiles.length > 3 && (
                  <Text style={[styles.filePreviewMore, {color: colors.text.tertiary}]}>
                    +{pickedFiles.length - 3} more
                  </Text>
                )}
              </View>
            )}

            <View style={styles.sendActions}>
              <BeamButton
                label={pickedFiles.length > 0 ? `${pickedFiles.length} file${pickedFiles.length > 1 ? 's' : ''} picked` : 'Pick Files'}
                variant="ghost"
                icon={<Icon name="folder-open" size={16} color="#A78BFA" />}
                onPress={pickFiles}
                style={styles.sendActionBtn}
              />
              {pickedFiles.length > 0 && (
                <BeamButton
                  label="Beam It!"
                  variant="primary"
                  icon={<Icon name="bolt" size={16} color="#fff" />}
                  onPress={handleSend}
                  style={styles.sendActionBtn}
                />
              )}
            </View>

            {/* Clipboard share */}
            <TouchableOpacity
              style={[styles.clipboardBtn, {borderColor: colors.borderSubtle}]}
              onPress={() => {/* Opens clipboard modal */}}>
              <Icon name="content-paste" size={16} color={Colors.brand.secondary[0]} />
              <Text style={[styles.clipboardText, {color: Colors.brand.secondary[0]}]}>
                Share Clipboard
              </Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* ── Active transfers ──────────────────────────────────────── */}
        {[...activeTransfers, ...recentCompleted].length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.text.secondary}]}>TRANSFERS</Text>
            {[...activeTransfers, ...recentCompleted].map(t => (
              <TransferCard
                key={t.id}
                transfer={t}
                onCancel={() => cancelTransfer(t.id)}
                onDismiss={() => {/* dismiss completed */}}
              />
            ))}
          </View>
        )}

        <View style={{height: 100}} />
      </ScrollView>

      {/* ── Incoming transfer modal ───────────────────────────────── */}
      <IncomingRequestModal
        transfer={state.pendingRequest}
        onAccept={() => acceptTransfer(state.pendingRequest?.id ?? '')}
        onReject={() => rejectTransfer(state.pendingRequest?.id ?? '')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {flex: 1},
  content: {paddingHorizontal: Spacing.xl, paddingTop: 60},
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.xl,
  },
  appName: {...Typography.headingLarge},
  appSub: {...Typography.bodyMedium, marginTop: 2},
  settingsBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  radarWrap: {
    alignItems: 'center', justifyContent: 'center',
    height: 320, marginBottom: Spacing.xl,
  },
  radarRing: {
    position: 'absolute', borderWidth: 1.5,
  },
  beaconBtn: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.lg,
  },
  section: {marginBottom: Spacing.xl},
  sectionTitle: {...Typography.labelSmall, letterSpacing: 1.5, marginBottom: Spacing.md},
  deviceRow: {paddingBottom: Spacing.sm},
  emptyCard: {alignItems: 'center', paddingVertical: Spacing.xxxl},
  emptyTitle: {...Typography.headingSmall, marginTop: Spacing.md, textAlign: 'center'},
  emptyMeta: {...Typography.bodyMedium, textAlign: 'center', marginTop: Spacing.sm, maxWidth: 260},
  sendPanel: {marginBottom: Spacing.xl},
  sendHeader: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg},
  sendTitle: {...Typography.headingSmall},
  filePreview: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filePreviewRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 3},
  filePreviewName: {...Typography.bodySmall, flex: 1},
  filePreviewSize: {...Typography.bodySmall},
  filePreviewMore: {...Typography.bodySmall, textAlign: 'center', paddingTop: Spacing.xs},
  sendActions: {flexDirection: 'row', gap: Spacing.md},
  sendActionBtn: {flex: 1},
  clipboardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.full,
    paddingVertical: Spacing.sm, marginTop: Spacing.md,
  },
  clipboardText: {...Typography.labelMedium},
});

export default HomeScreen;
