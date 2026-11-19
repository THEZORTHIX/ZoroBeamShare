import React, {useState} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, SectionList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

import {AmbientBackground} from '../components/AmbientBackground';
import {GlassCard} from '../components/GlassCard';
import {BeamButton} from '../components/BeamButton';

import {useTheme} from '../theme/ThemeContext';
import {Colors, Spacing, Typography, Radius} from '../theme';
import {useApp} from '../store/AppContext';
import {HistoryEntry} from '../utils/types';
import {
  formatBytes, relativeTime, getCategoryGradient,
  getCategoryIcon, getFileCategory,
} from '../utils/helpers';
import {clearHistory} from '../utils/storage';

/**
 * HistoryScreen — chronological log of all past transfers and clipboard shares.
 * Grouped by date, with expandable file lists and status indicators.
 */
const HistoryScreen: React.FC = () => {
  const {colors, isDark} = useTheme();
  const {state, clearHistory: clearHistoryState} = useApp();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleClear = () => {
    Alert.alert(
      'Clear History',
      'All transfer and clipboard history will be deleted. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            clearHistoryState();
          },
        },
      ],
    );
  };

  // Group by date
  const grouped = state.history.reduce<Record<string, HistoryEntry[]>>((acc, entry) => {
    const date = new Date(entry.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) label = 'Today';
    else if (date.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});

    if (!acc[label]) acc[label] = [];
    acc[label].push(entry);
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([title, data]) => ({title, data}));

  const renderEntry = ({item}: {item: HistoryEntry}) => {
    if (item.type === 'clipboard' && item.clipboard) {
      return (
        <GlassCard style={styles.entryCard} borderRadius={Radius.lg} padding={Spacing.md}>
          <View style={styles.entryRow}>
            <View style={[styles.entryIcon, {backgroundColor: `${Colors.brand.secondary[0]}22`}]}>
              <Icon name="content-paste" size={18} color={Colors.brand.secondary[0]} />
            </View>
            <View style={styles.entryInfo}>
              <Text style={[styles.entryTitle, {color: colors.text.primary}]} numberOfLines={1}>
                {item.clipboard.content}
              </Text>
              <Text style={[styles.entryMeta, {color: colors.text.tertiary}]}>
                Clipboard · {item.clipboard.device.name} · {relativeTime(item.timestamp)}
              </Text>
            </View>
          </View>
        </GlassCard>
      );
    }

    if (item.type === 'transfer' && item.transfer) {
      const t = item.transfer;
      const firstFile = t.files[0];
      const category = firstFile ? getFileCategory(firstFile.mimeType, firstFile.name) : 'other';
      const gradient = getCategoryGradient(category);
      const icon = getCategoryIcon(category);
      const isExp = expanded.has(item.id);

      const statusColors: Record<string, string> = {
        completed: '#34D399', failed: '#EF4444', cancelled: '#64748B',
      };

      return (
        <GlassCard style={styles.entryCard} borderRadius={Radius.lg} padding={0}>
          <TouchableOpacity onPress={() => toggleExpand(item.id)} activeOpacity={0.8}>
            <View style={[styles.entryRow, {padding: Spacing.md}]}>
              <LinearGradient colors={gradient} style={styles.entryIcon} start={{x:0,y:0}} end={{x:1,y:1}}>
                <Icon name={icon} size={18} color="#fff" />
              </LinearGradient>
              <View style={styles.entryInfo}>
                <Text style={[styles.entryTitle, {color: colors.text.primary}]} numberOfLines={1}>
                  {t.files.length === 1 ? firstFile?.name : `${t.files.length} files`}
                </Text>
                <Text style={[styles.entryMeta, {color: colors.text.tertiary}]}>
                  {t.direction === 'send' ? '↑ Sent to' : '↓ Received from'} {t.device.name} ·{' '}
                  {formatBytes(t.totalBytes)} · {relativeTime(item.timestamp)}
                </Text>
              </View>
              <View style={styles.entryRight}>
                <View style={[styles.statusDot, {backgroundColor: statusColors[t.status] ?? '#94A3B8'}]} />
                <Icon
                  name={isExp ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={20}
                  color={colors.text.tertiary}
                />
              </View>
            </View>

            {/* Expanded file list */}
            {isExp && (
              <View style={[styles.fileList, {borderTopColor: colors.borderSubtle}]}>
                {t.files.map(f => (
                  <View key={f.id} style={styles.fileItem}>
                    <Icon name="insert-drive-file" size={14} color={colors.text.tertiary} />
                    <Text style={[styles.fileName, {color: colors.text.secondary}]} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text style={[styles.fileSize, {color: colors.text.tertiary}]}>
                      {formatBytes(f.size)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        </GlassCard>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <AmbientBackground isDark={isDark} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, {color: colors.text.primary}]}>History</Text>
        {state.history.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Text style={[styles.clearBtn, {color: Colors.brand.danger[0]}]}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {state.history.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Icon name="history" size={64} color={colors.text.tertiary} />
          <Text style={[styles.emptyTitle, {color: colors.text.secondary}]}>No history yet</Text>
          <Text style={[styles.emptyMeta, {color: colors.text.tertiary}]}>
            Your transfers and clipboard shares will appear here
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={renderEntry}
          renderSectionHeader={({section: {title}}) => (
            <Text style={[styles.dateLabel, {color: colors.text.tertiary}]}>{title}</Text>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{height: Spacing.sm}} />}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.lg,
  },
  title: {...Typography.headingLarge},
  clearBtn: {...Typography.labelLarge},
  list: {paddingHorizontal: Spacing.xl, paddingBottom: 100},
  dateLabel: {...Typography.labelSmall, letterSpacing: 1.2, marginVertical: Spacing.md},
  entryCard: {marginBottom: 0},
  entryRow: {flexDirection: 'row', alignItems: 'center'},
  entryIcon: {
    width: 40, height: 40, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  entryInfo: {flex: 1},
  entryTitle: {...Typography.bodyLarge, fontWeight: '600'},
  entryMeta: {...Typography.bodySmall, marginTop: 2},
  entryRight: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  statusDot: {width: 8, height: 8, borderRadius: 4},
  fileList: {borderTopWidth: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm},
  fileItem: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4},
  fileName: {...Typography.bodySmall, flex: 1},
  fileSize: {...Typography.bodySmall},
  emptyWrap: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md},
  emptyTitle: {...Typography.headingMedium},
  emptyMeta: {...Typography.bodyMedium, textAlign: 'center', maxWidth: 260},
});

export default HistoryScreen;
