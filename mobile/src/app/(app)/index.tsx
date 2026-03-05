import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { LinearGradient } from 'expo-linear-gradient'
import { Plus, X, Check, Settings, ChevronLeft, ChevronRight, LogOut } from 'lucide-react-native'
import BallsCanvas from '@/components/BallsCanvas'
import {
  useTaskStore,
  getBallColor,
  type Task,
  type Importance,
  type Effort,
} from '@/lib/state/tasks'
import { authClient } from '@/lib/auth/auth-client'
import { useInvalidateSession } from '@/lib/auth/use-session'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82

type DatePreset = 'today' | 'week' | 'month' | 'custom'

const DATE_PRESETS: { key: DatePreset; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 0 },
  { key: 'week', label: 'This week', days: 7 },
  { key: 'month', label: 'This month', days: 30 },
]

function getPresetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ImportanceLabel({ value }: { value: number }) {
  const labels = ['Minimal', 'Low', 'Medium', 'High', 'Critical']
  return <Text style={styles.sliderValueLabel}>{labels[value - 1]}</Text>
}

function EffortLabel({ value }: { value: number }) {
  const labels = ['Trivial', 'Easy', 'Moderate', 'Hard', 'Massive']
  return <Text style={styles.sliderValueLabel}>{labels[value - 1]}</Text>
}

function RatingSelector({
  value,
  onChange,
  colorize,
}: {
  value: number
  onChange: (v: number) => void
  colorize?: boolean
}) {
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value
        const color = colorize ? getBallColor(n as Importance) : '#6C6CFF'
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[
              styles.ratingDot,
              { backgroundColor: active ? color : 'rgba(255,255,255,0.1)' },
              active && { shadowColor: color, shadowOpacity: 0.7, shadowRadius: 6 },
            ]}
          />
        )
      })}
    </View>
  )
}

interface QuickActionMenuProps {
  taskId: string | null
  onDismiss: () => void
}

function QuickActionMenu({ taskId, onDismiss }: QuickActionMenuProps) {
  const toggleComplete = useTaskStore((s) => s.toggleComplete)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const tasks = useTaskStore((s) => s.tasks)

  if (!taskId) return null

  const task = tasks.find((t) => t.id === taskId)
  if (!task) return null

  return (
    <Pressable style={styles.quickActionOverlay} onPress={onDismiss}>
      <View style={styles.quickActionMenu}>
        <Text style={styles.quickActionTitle} numberOfLines={1}>
          {task.title}
        </Text>
        <Pressable
          style={styles.quickActionItem}
          onPress={() => {
            toggleComplete(taskId)
            onDismiss()
          }}
          testID="quick-action-complete"
        >
          <Check size={18} color="#4ADE80" />
          <Text style={[styles.quickActionText, { color: '#4ADE80' }]}>
            {task.completed ? 'Mark incomplete' : 'Mark complete'}
          </Text>
        </Pressable>
        <View style={styles.quickActionDivider} />
        <Pressable
          style={styles.quickActionItem}
          onPress={() => {
            deleteTask(taskId)
            onDismiss()
          }}
          testID="quick-action-delete"
        >
          <X size={18} color="#F87171" />
          <Text style={[styles.quickActionText, { color: '#F87171' }]}>Delete task</Text>
        </Pressable>
      </View>
    </Pressable>
  )
}

const calStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 80,
  },
  card: {
    width: 320,
    backgroundColor: '#1A1735',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dowLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: '#7C5CFC',
    borderRadius: 20,
  },
  cellToday: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.5)',
  },
  cellText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  cellTextSelected: {
    color: '#fff',
    fontFamily: 'DMSans_500Medium',
  },
  cellTextPast: {
    color: 'rgba(255,255,255,0.2)',
  },
  cellTextToday: {
    color: '#A78BFA',
    fontFamily: 'DMSans_500Medium',
  },
})

function CalendarPicker({
  visible,
  selectedDate,
  onSelect,
  onClose,
}: {
  visible: boolean
  selectedDate: Date
  onSelect: (date: Date) => void
  onClose: () => void
}) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())

  if (!visible) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build days grid
  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const startDow = firstDay.getDay() // 0=Sun
  const daysInMonth = lastDay.getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa']

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  return (
    <Pressable style={calStyles.overlay} onPress={onClose}>
      <Pressable style={calStyles.card} onPress={e => e.stopPropagation()}>
        {/* Header row: < Month Year > */}
        <View style={calStyles.header}>
          <Pressable onPress={prevMonth} style={calStyles.navBtn}>
            <ChevronLeft size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <Text style={calStyles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <Pressable onPress={nextMonth} style={calStyles.navBtn}>
            <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        {/* Day-of-week labels */}
        <View style={calStyles.dowRow}>
          {DOW.map(d => (
            <Text key={d} style={calStyles.dowLabel}>{d}</Text>
          ))}
        </View>

        {/* Day cells grid */}
        <View style={calStyles.grid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={`empty-${idx}`} style={calStyles.cell} />
            const cellDate = new Date(viewYear, viewMonth, day)
            cellDate.setHours(0, 0, 0, 0)
            const isSelected =
              selectedDate.getFullYear() === viewYear &&
              selectedDate.getMonth() === viewMonth &&
              selectedDate.getDate() === day
            const isPast = cellDate < today
            const isToday =
              today.getFullYear() === viewYear &&
              today.getMonth() === viewMonth &&
              today.getDate() === day

            return (
              <Pressable
                key={day}
                style={[
                  calStyles.cell,
                  isSelected && calStyles.cellSelected,
                  isToday && !isSelected && calStyles.cellToday,
                ]}
                onPress={() => {
                  if (!isPast) {
                    onSelect(cellDate)
                    onClose()
                  }
                }}
                disabled={isPast}
              >
                <Text style={[
                  calStyles.cellText,
                  isSelected && calStyles.cellTextSelected,
                  isPast && calStyles.cellTextPast,
                  isToday && !isSelected && calStyles.cellTextToday,
                ]}>
                  {day}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </Pressable>
    </Pressable>
  )
}

export default function IndexScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const addTask = useTaskStore((s) => s.addTask)
  const fetchTasks = useTaskStore((s) => s.fetchTasks)
  const invalidateSession = useInvalidateSession()

  useEffect(() => {
    fetchTasks()
  }, [])

  // Sheet state
  const sheetTranslateY = useSharedValue(SHEET_HEIGHT)
  const sheetVisible = useSharedValue(0)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Quick action state
  const [quickActionTaskId, setQuickActionTaskId] = useState<string | null>(null)

  // Settings state
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [signingOut, setSigningOut] = useState<boolean>(false)

  // Settings store
  const showBallLabels = useTaskStore((s) => s.showBallLabels)
  const setShowBallLabels = useTaskStore((s) => s.setShowBallLabels)

  // Form state
  const [title, setTitle] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('week')
  const [customDate, setCustomDate] = useState<string | null>(null)
  const [importance, setImportance] = useState<Importance>(3)
  const [effort, setEffort] = useState<Effort>(2)
  const [showCalendar, setShowCalendar] = useState(false)

  const openSheet = useCallback(() => {
    setIsSheetOpen(true)
    sheetTranslateY.value = withSpring(0, { damping: 22, stiffness: 200 })
    sheetVisible.value = withTiming(1, { duration: 200 })
  }, [])

  const closeSheet = useCallback(() => {
    sheetTranslateY.value = withSpring(SHEET_HEIGHT, { damping: 22, stiffness: 200 }, (done) => {
      if (done) runOnJS(setIsSheetOpen)(false)
    })
    sheetVisible.value = withTiming(0, { duration: 200 })
    setTitle('')
    setSelectedPreset('week')
    setCustomDate(null)
    setImportance(3)
    setEffort(2)
  }, [])

  const handleSave = useCallback(() => {
    if (!title.trim()) return
    const dueDate =
      customDate ??
      getPresetDate(DATE_PRESETS.find((p) => p.key === selectedPreset)?.days ?? 7)

    addTask({
      title: title.trim(),
      dueDate,
      importance,
      effort,
      effortMode: 'manual',
      completed: false,
      showSubtasks: false,
    })
    closeSheet()
  }, [title, selectedPreset, customDate, importance, effort, addTask, closeSheet])

  const handleTapTask = useCallback(
    (taskId: string) => {
      router.push(`/task/${taskId}` as any)
    },
    [router]
  )

  const handleLongPressTask = useCallback((taskId: string) => {
    setQuickActionTaskId(taskId)
  }, [])

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    try {
      await authClient.signOut()
      await invalidateSession()
    } catch (e) {
      // ignore
    } finally {
      setSigningOut(false)
      setShowSettings(false)
    }
  }, [invalidateSession])

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }))

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheetVisible.value, [0, 1], [0, 0.6], Extrapolation.CLAMP),
    pointerEvents: sheetVisible.value > 0 ? 'auto' : 'none',
  }))

  const getDueDate = () => {
    if (customDate) return customDate
    return getPresetDate(DATE_PRESETS.find((p) => p.key === selectedPreset)?.days ?? 7)
  }

  return (
    <View style={styles.container} testID="index-screen">
      {/* Cosmic background */}
      <LinearGradient
        colors={['#06060F', '#0A0A1A', '#0D0B1F']}
        style={StyleSheet.absoluteFill}
      />

      {/* Stars background dots */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: 40 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                left: `${(i * 37 + 7) % 100}%` as any,
                top: `${(i * 53 + 13) % 100}%` as any,
                opacity: 0.15 + (i % 5) * 0.07,
                width: i % 3 === 0 ? 2 : 1,
                height: i % 3 === 0 ? 2 : 1,
              },
            ]}
          />
        ))}
      </View>

      {/* Balls canvas — scrollable timeline */}
      <View style={StyleSheet.absoluteFill}>
        <BallsCanvas onTapTask={handleTapTask} onLongPressTask={handleLongPressTask} />
      </View>

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header} pointerEvents="none">
        <Text style={styles.appTitle}>Jugglr</Text>
        <Text style={styles.appSubtitle}>keep all your balls in the air</Text>
      </SafeAreaView>

      {/* Settings button */}
      <SafeAreaView edges={['top']} style={styles.settingsButtonContainer}>
        <Pressable
          onPress={() => setShowSettings(true)}
          style={styles.settingsButton}
        >
          <Settings size={18} color="rgba(255,255,255,0.45)" />
        </Pressable>
      </SafeAreaView>

      {/* Add task button */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 32 }]}>
        <Pressable
          onPress={openSheet}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          testID="add-task-button"
        >
          <LinearGradient
            colors={['#7C5CFC', '#5B6EF5']}
            style={styles.fabGradient}
          >
            <Plus size={26} color="#fff" strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
      </Animated.View>

      {/* Add Task Sheet */}
      {isSheetOpen ? (
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }, sheetAnimStyle]}>
          <LinearGradient
            colors={['#12102A', '#0E0C22']}
            style={StyleSheet.absoluteFill}
          />
          {/* Sheet handle */}
          <View style={styles.sheetHandle} />

          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>New task</Text>
            <Pressable onPress={closeSheet} style={styles.closeButton} testID="close-sheet-button">
              <X size={20} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.sheetScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>TASK</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What needs to be done?"
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={styles.titleInput}
                autoFocus
                returnKeyType="done"
                testID="task-title-input"
              />
            </View>

            {/* Due date */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DUE DATE</Text>
              <View style={styles.presetRow}>
                {DATE_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.key}
                    onPress={() => {
                      setSelectedPreset(preset.key)
                      setCustomDate(null)
                    }}
                    style={[
                      styles.presetChip,
                      selectedPreset === preset.key && !customDate && styles.presetChipActive,
                    ]}
                    testID={`date-preset-${preset.key}`}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        selectedPreset === preset.key && !customDate && styles.presetChipTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setShowCalendar(true)}
                  style={[styles.presetChip, customDate != null && styles.presetChipActive]}
                  testID="date-preset-custom"
                >
                  <Text style={[styles.presetChipText, customDate != null && styles.presetChipTextActive]}>
                    {customDate ? formatDate(customDate) : 'Pick date'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Importance */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>IMPORTANCE</Text>
                <ImportanceLabel value={importance} />
              </View>
              <RatingSelector value={importance} onChange={(v) => setImportance(v as Importance)} colorize />
            </View>

            {/* Effort */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>EFFORT</Text>
                <EffortLabel value={effort} />
              </View>
              <RatingSelector value={effort} onChange={(v) => setEffort(v as Effort)} />
            </View>

            <View style={{ height: 8 }} />
          </ScrollView>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed, !title.trim() && styles.saveButtonDisabled]}
            disabled={!title.trim()}
            testID="save-task-button"
          >
            <LinearGradient
              colors={title.trim() ? ['#7C5CFC', '#5B6EF5'] : ['#2A2840', '#2A2840']}
              style={styles.saveButtonGradient}
            >
              <Text style={[styles.saveButtonText, !title.trim() && styles.saveButtonTextDisabled]}>
                Add to Jugglr
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* Quick action menu */}
      {quickActionTaskId ? (
        <QuickActionMenu
          taskId={quickActionTaskId}
          onDismiss={() => setQuickActionTaskId(null)}
        />
      ) : null}

      {/* Settings panel */}
      {showSettings ? (
        <Pressable style={[StyleSheet.absoluteFillObject, styles.settingsOverlay]} onPress={() => setShowSettings(false)}>
          <Pressable
            style={styles.settingsPanel}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.settingsPanelHandle} />
            <Text style={styles.settingsPanelTitle}>Display</Text>

            <View style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>Show task names on balls</Text>
              <Pressable
                onPress={() => setShowBallLabels(!showBallLabels)}
                style={[styles.toggle, showBallLabels ? styles.toggleOn : null]}
              >
                <View style={[styles.toggleThumb, showBallLabels ? styles.toggleThumbOn : null]} />
              </Pressable>
            </View>

            <View style={styles.settingsDivider} />

            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}
              testID="sign-out-button"
            >
              <LogOut size={16} color="#F87171" />
              <Text style={styles.signOutText}>{signingOut ? 'Signing out...' : 'Sign out'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      ) : null}

      {/* Calendar picker */}
      <CalendarPicker
        visible={showCalendar}
        selectedDate={customDate ? new Date(customDate) : new Date(getDueDate())}
        onSelect={(date) => {
          setCustomDate(date.toISOString())
          setSelectedPreset('custom' as any)
        }}
        onClose={() => setShowCalendar(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06060F',
  },
  star: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 8,
    zIndex: 10,
  },
  appTitle: {
    fontFamily: 'Syne_800ExtraBold',
    fontSize: 34,
    color: '#fff',
    letterSpacing: -1,
    textShadowColor: 'rgba(124, 92, 252, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  appSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  fabContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 20,
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 12,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  fabGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    backgroundColor: '#000',
    zIndex: 30,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    zIndex: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sheetTitle: {
    fontFamily: 'Syne_800ExtraBold',
    fontSize: 24,
    color: '#fff',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  fieldLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  sliderValueLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  titleInput: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 18,
    color: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  presetChipActive: {
    backgroundColor: 'rgba(124,92,252,0.25)',
    borderColor: 'rgba(124,92,252,0.6)',
  },
  presetChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  presetChipTextActive: {
    color: '#C4B5FD',
  },
  dueDateDisplay: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  saveButton: {
    marginHorizontal: 24,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    paddingVertical: 17,
    alignItems: 'center',
  },
  saveButtonText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.3,
  },
  saveButtonTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
  quickActionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  quickActionMenu: {
    width: 280,
    borderRadius: 20,
    backgroundColor: '#1A1830',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  quickActionTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  quickActionText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
  },
  quickActionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 20,
  },
  settingsButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 15,
  },
  settingsButton: {
    padding: 12,
    paddingRight: 20,
  },
  settingsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 60,
  },
  settingsPanel: {
    backgroundColor: '#161428',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  settingsPanelHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  settingsPanelTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingsLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: '#7C5CFC',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  toggleThumbOn: {
    backgroundColor: '#fff',
    transform: [{ translateX: 20 }],
  },
  settingsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  signOutButtonPressed: {
    opacity: 0.6,
  },
  signOutText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: '#F87171',
  },
})
