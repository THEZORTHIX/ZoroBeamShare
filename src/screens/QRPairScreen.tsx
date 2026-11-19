import React, {useState, useRef} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Clipboard, Share,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

import {AmbientBackground} from '../components/AmbientBackground';
import {GlassCard} from '../components/GlassCard';
import {BeamButton} from '../components/BeamButton';
import {DeviceCard} from '../components/DeviceCard';

import {useTheme} from '../theme/ThemeContext';
import {Colors, Spacing, Typography, Radius, Shadow} from '../theme';
import {useApp} from '../store/AppContext';
import {NearbyDevice} from '../utils/types';
import {discoveryService} from '../services/DiscoveryService';

/**
 * QRPairScreen — QR code pairing flow.
 * Shows local QR code for others to scan, plus camera scanner
 * to scan another device's code and instantly connect.
 */
const QRPairScreen: React.FC = () => {
  const {colors, isDark} = useTheme();
  const {state, sendClipboard} = useApp();
  const [clipText, setClipText] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<NearbyDevice | null>(null);
  const [sent, setSent] = useState(false);
  const [tab, setTab] = useState<'my-code' | 'scan' | 'clipboard'>('my-code');

  const qrPayload = JSON.stringify({
    app: 'ZoroBeam',
    ver: 1,
    id: discoveryService.getLocalId(),
    name: state.deviceName,
  });

  const handleSendClipboard = async () => {
    if (!selectedDevice || !clipText.trim()) return;
    await sendClipboard(selectedDevice, clipText.trim());
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  const handlePasteClipboard = async () => {
    const text = await Clipboard.getString();
    if (text) setClipText(text);
  };

  const TABS = [
    {id: 'my-code', label: 'My Code', icon: 'qr-code'},
    {id: 'scan', label: 'Scan', icon: 'qr-code-scanner'},
    {id: 'clipboard', label: 'Clipboard', icon: 'content-paste'},
  ] as const;

  return (
    <View style={styles.container}>
      <AmbientBackground isDark={isDark} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, {color: colors.text.primary}]}>Pair & Share</Text>
          <Text style={[styles.subtitle, {color: colors.text.tertiary}]}>
            Instant connection via QR or share clipboard text
          </Text>
        </View>

        {/* Tab switcher */}
        <GlassCard style={styles.tabs} borderRadius={Radius.full} padding={4}>
          <View style={styles.tabRow}>
            {TABS.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tab, tab === t.id && styles.tabActive]}
                onPress={() => setTab(t.id as typeof tab)}>
                {tab === t.id ? (
                  <LinearGradient
                    colors={Colors.brand.primary}
                    style={styles.tabGrad}
                    start={{x:0,y:0}} end={{x:1,y:1}}>
                    <Icon name={t.icon} size={16} color="#fff" style={{marginRight: 4}} />
                    <Text style={styles.tabLabelActive}>{t.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabInner}>
                    <Icon name={t.icon} size={16} color={colors.text.tertiary} style={{marginRight: 4}} />
                    <Text style={[styles.tabLabel, {color: colors.text.tertiary}]}>{t.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* My QR Code tab */}
        {tab === 'my-code' && (
          <GlassCard strong borderRadius={Radius.xl} style={styles.qrCard}>
            <Text style={[styles.qrHint, {color: colors.text.secondary}]}>
              Let nearby devices scan this to connect instantly
            </Text>
            <View style={[styles.qrBox, {backgroundColor: '#fff'}]}>
              <QRCode
                value={qrPayload}
                size={180}
                color="#1A1A3A"
                backgroundColor="#ffffff"
              />
            </View>
            <Text style={[styles.qrName, {color: colors.text.primary}]}>{state.deviceName}</Text>
            <Text style={[styles.qrId, {color: colors.text.tertiary}]}>
              ID: {discoveryService.getLocalId().slice(0, 12)}…
            </Text>
            <BeamButton
              label="Share My Code"
              variant="ghost"
              size="sm"
              icon={<Icon name="share" size={16} color="#A78BFA" />}
              onPress={() => Share.share({message: `Connect to me on ZoroBeam!\n${qrPayload}`})}
              style={{marginTop: Spacing.md}}
            />
          </GlassCard>
        )}

        {/* Scan tab */}
        {tab === 'scan' && (
          <GlassCard strong borderRadius={Radius.xl} style={styles.qrCard}>
            <Text style={[styles.qrHint, {color: colors.text.secondary}]}>
              Scan another device's ZoroBeam QR code to connect
            </Text>
            {/* Camera scanner placeholder — in production use react-native-camera */}
            <View style={[styles.scannerBox, {borderColor: Colors.brand.primary[0]}]}>
              <Icon name="qr-code-scanner" size={80} color={`${Colors.brand.primary[0]}66`} />
              <Text style={[styles.scannerText, {color: colors.text.tertiary}]}>
                Camera viewfinder here{'\n'}(requires Camera permission)
              </Text>
              {/* Corner brackets */}
              {['tl','tr','bl','br'].map(c => (
                <View key={c} style={[styles.corner, styles[c as keyof typeof styles] as any,
                  {borderColor: Colors.brand.primary[0]}]} />
              ))}
            </View>
          </GlassCard>
        )}

        {/* Clipboard tab */}
        {tab === 'clipboard' && (
          <GlassCard strong borderRadius={Radius.xl} style={styles.clipCard}>
            <Text style={[styles.clipTitle, {color: colors.text.primary}]}>Share Clipboard Text</Text>
            <Text style={[styles.clipSub, {color: colors.text.tertiary}]}>
              Send any text instantly to a nearby device
            </Text>

            {/* Device selector */}
            {state.devices.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deviceRow}>
                {state.devices.map(d => (
                  <DeviceCard
                    key={d.id}
                    device={d}
                    isSelected={selectedDevice?.id === d.id}
                    onPress={dd => setSelectedDevice(prev => prev?.id === dd.id ? null : dd)}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={[styles.noDevices, {color: colors.text.tertiary}]}>
                No devices nearby. Start scanning from the Home tab.
              </Text>
            )}

            {/* Text input */}
            <View style={[styles.clipInput, {borderColor: colors.border, backgroundColor: colors.surfaceSubtle}]}>
              <TextInput
                style={[styles.clipTextInput, {color: colors.text.primary}]}
                value={clipText}
                onChangeText={setClipText}
                placeholder="Type or paste text to share…"
                placeholderTextColor={colors.text.tertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <TouchableOpacity onPress={handlePasteClipboard} style={styles.pasteBtn}>
                <Icon name="content-paste" size={18} color={Colors.brand.secondary[0]} />
              </TouchableOpacity>
            </View>

            <BeamButton
              label={sent ? 'Sent! ✓' : 'Send Text'}
              variant={sent ? 'secondary' : 'primary'}
              icon={!sent ? <Icon name="send" size={16} color="#fff" /> : undefined}
              onPress={handleSendClipboard}
              disabled={!selectedDevice || !clipText.trim()}
              fullWidth
              style={{marginTop: Spacing.lg}}
            />
          </GlassCard>
        )}

        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingHorizontal: Spacing.xl},
  header: {paddingTop: 60, paddingBottom: Spacing.xl},
  title: {...Typography.headingLarge},
  subtitle: {...Typography.bodyMedium, marginTop: 4},
  tabs: {marginBottom: Spacing.xl},
  tabRow: {flexDirection: 'row'},
  tab: {flex: 1, borderRadius: Radius.full, overflow: 'hidden'},
  tabActive: {},
  tabGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.sm, borderRadius: Radius.full,
  },
  tabInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  tabLabel: {...Typography.labelMedium},
  tabLabelActive: {...Typography.labelMedium, color: '#fff'},
  qrCard: {alignItems: 'center'},
  qrHint: {...Typography.bodyMedium, textAlign: 'center', marginBottom: Spacing.xl},
  qrBox: {
    padding: Spacing.xl, borderRadius: Radius.xl,
    ...{shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8},
  },
  qrName: {...Typography.headingSmall, marginTop: Spacing.xl, textAlign: 'center'},
  qrId: {...Typography.bodySmall, marginTop: 4, textAlign: 'center'},
  scannerBox: {
    width: 220, height: 220, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderRadius: Radius.xl, alignSelf: 'center',
    marginVertical: Spacing.xl, borderStyle: 'dashed',
  },
  scannerText: {...Typography.bodySmall, textAlign: 'center', marginTop: Spacing.md},
  corner: {position: 'absolute', width: 24, height: 24, borderColor: 'transparent'},
  tl: {top: 8, left: 8, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6},
  tr: {top: 8, right: 8, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6},
  bl: {bottom: 8, left: 8, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6},
  br: {bottom: 8, right: 8, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6},
  clipCard: {},
  clipTitle: {...Typography.headingSmall},
  clipSub: {...Typography.bodyMedium, marginTop: 4, marginBottom: Spacing.xl},
  deviceRow: {marginBottom: Spacing.lg},
  noDevices: {...Typography.bodyMedium, textAlign: 'center', paddingVertical: Spacing.xl},
  clipInput: {
    borderWidth: 1.5, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    minHeight: 110,
  },
  clipTextInput: {...Typography.bodyLarge, flex: 1},
  pasteBtn: {position: 'absolute', top: Spacing.sm, right: Spacing.sm},
});

export default QRPairScreen;
