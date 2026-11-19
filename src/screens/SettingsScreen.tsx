import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  Switch, TouchableOpacity, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {AmbientBackground} from '../components/AmbientBackground';
import {GlassCard} from '../components/GlassCard';
import {BeamButton} from '../components/BeamButton';

import {useTheme} from '../theme/ThemeContext';
import {Colors, Spacing, Typography, Radius} from '../theme';
import {useApp} from '../store/AppContext';
import {saveDeviceName, saveSavePath, saveAutoReceive} from '../utils/storage';
import DeviceInfo from 'react-native-device-info';

/**
 * SettingsScreen — device name, save path, theme toggle,
 * auto-accept, QR pairing code, and app info.
 */
const SettingsScreen: React.FC = () => {
  const {colors, isDark, toggle: toggleTheme} = useTheme();
  const {state, setDeviceName, setSavePath} = useApp();

  const [nameInput, setNameInput] = useState(state.deviceName);
  const [pathInput, setPathInput] = useState(state.savePath);
  const [autoAccept, setAutoAccept] = useState(false);
  const [nameDirty, setNameDirty] = useState(false);

  const handleSaveName = useCallback(async () => {
    if (!nameInput.trim()) return;
    setDeviceName(nameInput.trim());
    await saveDeviceName(nameInput.trim());
    setNameDirty(false);
    Alert.alert('Saved', 'Device name updated!');
  }, [nameInput, setDeviceName]);

  const handleSavePath = useCallback(async () => {
    if (!pathInput.trim()) return;
    setSavePath(pathInput.trim());
    await saveSavePath(pathInput.trim());
    Alert.alert('Saved', 'Save location updated!');
  }, [pathInput, setSavePath]);

  const handleAutoAccept = useCallback(async (value: boolean) => {
    setAutoAccept(value);
    await saveAutoReceive(value);
  }, []);

  const Section: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, {color: colors.text.tertiary}]}>{title}</Text>
      {children}
    </View>
  );

  const RowItem: React.FC<{icon: string; iconColor: string; label: string; children: React.ReactNode}> = (
    {icon, iconColor, label, children}) => (
    <View style={[styles.rowItem, {borderBottomColor: colors.borderSubtle}]}>
      <View style={[styles.rowIcon, {backgroundColor: `${iconColor}22`}]}>
        <Icon name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.rowLabel, {color: colors.text.primary}]}>{label}</Text>
      <View style={styles.rowRight}>{children}</View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AmbientBackground isDark={isDark} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, {color: colors.text.primary}]}>Settings</Text>
        </View>

        {/* Identity */}
        <Section title="IDENTITY">
          <GlassCard borderRadius={Radius.xl} padding={Spacing.lg}>
            <Text style={[styles.fieldLabel, {color: colors.text.secondary}]}>Device Name</Text>
            <View style={[styles.inputRow, {borderColor: nameDirty ? Colors.brand.primary[0] : colors.border}]}>
              <Icon name="devices" size={18} color={colors.text.tertiary} style={{marginRight: Spacing.sm}} />
              <TextInput
                style={[styles.input, {color: colors.text.primary}]}
                value={nameInput}
                onChangeText={v => { setNameInput(v); setNameDirty(true); }}
                placeholder="Your device name"
                placeholderTextColor={colors.text.tertiary}
                maxLength={32}
              />
              {nameDirty && (
                <TouchableOpacity onPress={handleSaveName} style={styles.saveBtn}>
                  <LinearGradient colors={Colors.brand.primary} style={styles.saveBtnGrad} start={{x:0,y:0}} end={{x:1,y:1}}>
                    <Icon name="check" size={16} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.hint, {color: colors.text.tertiary}]}>
              This is how your device appears to others nearby
            </Text>
          </GlassCard>
        </Section>

        {/* Storage */}
        <Section title="STORAGE">
          <GlassCard borderRadius={Radius.xl} padding={Spacing.lg}>
            <Text style={[styles.fieldLabel, {color: colors.text.secondary}]}>Save Location</Text>
            <View style={[styles.inputRow, {borderColor: colors.border}]}>
              <Icon name="folder" size={18} color={colors.text.tertiary} style={{marginRight: Spacing.sm}} />
              <TextInput
                style={[styles.input, {color: colors.text.primary}]}
                value={pathInput}
                onChangeText={setPathInput}
                placeholder="/storage/emulated/0/ZoroBeamShare"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            <BeamButton
              label="Update Path"
              variant="ghost"
              size="sm"
              onPress={handleSavePath}
              style={{marginTop: Spacing.md, alignSelf: 'flex-start'}}
            />
          </GlassCard>
        </Section>

        {/* Preferences */}
        <Section title="PREFERENCES">
          <GlassCard borderRadius={Radius.xl} padding={0}>
            <RowItem icon="wb-sunny" iconColor={Colors.brand.warning[0]} label="Dark Mode">
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{true: Colors.brand.primary[0], false: colors.border}}
                thumbColor="#fff"
              />
            </RowItem>
            <RowItem icon="download" iconColor={Colors.brand.success[0]} label="Auto-Accept Transfers">
              <Switch
                value={autoAccept}
                onValueChange={handleAutoAccept}
                trackColor={{true: Colors.brand.primary[0], false: colors.border}}
                thumbColor="#fff"
              />
            </RowItem>
          </GlassCard>
        </Section>

        {/* About */}
        <Section title="ABOUT">
          <GlassCard borderRadius={Radius.xl} padding={0}>
            <RowItem icon="info" iconColor={Colors.brand.secondary[0]} label="Version">
              <Text style={[styles.rowValue, {color: colors.text.tertiary}]}>1.0.0</Text>
            </RowItem>
            <RowItem icon="code" iconColor={Colors.brand.primary[0]} label="Open Source">
              <Icon name="open-in-new" size={16} color={colors.text.tertiary} />
            </RowItem>
            <RowItem icon="security" iconColor={Colors.brand.success[0]} label="All transfers encrypted">
              <Icon name="check-circle" size={18} color={Colors.brand.success[0]} />
            </RowItem>
          </GlassCard>
        </Section>

        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
};

// Needed for LinearGradient in component
import LinearGradient from 'react-native-linear-gradient';

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingHorizontal: Spacing.xl},
  header: {paddingTop: 60, paddingBottom: Spacing.xl},
  title: {...Typography.headingLarge},
  section: {marginBottom: Spacing.xl},
  sectionLabel: {
    ...Typography.labelSmall, letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  fieldLabel: {...Typography.labelMedium, marginBottom: Spacing.sm},
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  input: {...Typography.bodyLarge, flex: 1},
  saveBtn: {marginLeft: Spacing.sm},
  saveBtnGrad: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  hint: {...Typography.bodySmall, marginTop: Spacing.sm},
  rowItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  rowLabel: {...Typography.bodyLarge, flex: 1},
  rowRight: {},
  rowValue: {...Typography.bodyMedium},
});

export default SettingsScreen;
