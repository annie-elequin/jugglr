import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronLeft, Check, Trash2, ChevronRight, CalendarDays } from 'lucide-react-native'
import {
  useTaskStore,
  getBallColor,
  getBallRadius,
  type Importance,
  type Effort,
} from '@/lib/state/tasks'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

const IMPORTANCE_LABELS = ['Minimal', 'Low', 'Medium', 'High', 'Critical']
const EFFORT_LABELS = ['Trivial', 'Easy', 'Moderate', 'Hard', 'Massive']

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

  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const startDow = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
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
        <View style={calStyles.header}>
          <Pressable onPress={prevMonth} style={calStyles.navBtn}>
            <ChevronLeft size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <Text style={calStyles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <Pressable onPress={nextMonth} style={calStyles.navBtn}>
            <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
        <View style={calStyles.dowRow}>
          {DOW.map(d => (
            <Text key={d} style={calStyles.dowLabel}>{d}</Text>
          ))}
        </View>
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

// Animated glowing orb component
function TaskOrb({ importance, effort }: { importance: Importance; effort: Effort }) {
  const color = getBallColor(importance)
  const radius = getBallRadius(effort)
  const orbSize = radius * 2.8

  // Gentle float animation
  const floatY = useSharedValue(0)
  const pulse = useSharedValue(1)

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(10, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    )
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.96, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    )
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { scale: pulse.value },
    ],
  }))

  // Parse color into rgba for glow
  const importanceColors: Record<number, string> = {
    1: '#6CB4FF',
    2: '#61D9A4',
    3: '#FFD166',
    4: '#FF8C42',
    5: '#FF4D6D',
  }
  const glowColor = importanceColors[importance] ?? color

  return (
    <View style={[styles.orbContainer, { height: orbSize + 60 }]}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          animStyle,
          {
            width: orbSize + 40,
            height: orbSize + 40,
            borderRadius: (orbSize + 40) / 2,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: `${glowColor}30`,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        {/* Mid glow ring */}
        <View
          style={{
            width: orbSize + 16,
            height: orbSize + 16,
            borderRadius: (orbSize + 16) / 2,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: `${glowColor}50`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Main orb */}
          <View
            style={{
              width: orbSize,
              height: orbSize,
              borderRadius: orbSize / 2,
              backgroundColor: glowColor,
              shadowColor: glowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: orbSize * 0.5,
              elevation: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Inner highlight */}
            <View
              style={{
                width: orbSize * 0.35,
                height: orbSize * 0.35,
                borderRadius: orbSize * 0.175,
                backgroundColor: 'rgba(255,255,255,0.35)',
                position: 'absolute',
                top: orbSize * 0.12,
                left: orbSize * 0.18,
              }}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  )
}

// Importance selector with colored dots
function ImportanceSelector({
  value,
  onChange,
}: {
  value: Importance
  onChange: (v: Importance) => void
}) {
  const importanceColors: Record<number, string> = {
    1: '#6CB4FF',
    2: '#61D9A4',
    3: '#FFD166',
    4: '#FF8C42',
    5: '#FF4D6D',
  }

  return (
    <View style={styles.selectorRow}>
      {([1, 2, 3, 4, 5] as Importance[]).map((n) => {
        const active = n === value
        const color = importanceColors[n]
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            testID={`importance-dot-${n}`}
            style={[
              styles.selectorDot,
              {
                backgroundColor: active ? color : 'rgba(255,255,255,0.08)',
                borderWidth: active ? 0 : 1,
                borderColor: color + '60',
                shadowColor: active ? color : 'transparent',
                shadowOpacity: active ? 0.7 : 0,
                shadowRadius: active ? 8 : 0,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          />
        )
      })}
      <Text style={styles.selectorLabel}>{IMPORTANCE_LABELS[value - 1]}</Text>
    </View>
  )
}

// Effort selector with size-varying dots
function EffortSelector({
  value,
  onChange,
}: {
  value: Effort
  onChange: (v: Effort) => void
}) {
  return (
    <View style={styles.selectorRow}>
      {([1, 2, 3, 4, 5] as Effort[]).map((n) => {
        const active = n === value
        const size = 18 + (n - 1) * 6
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            testID={`effort-dot-${n}`}
            style={[
              styles.selectorDotWrapper,
              { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
            ]}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: active ? '#7C5CFC' : 'rgba(255,255,255,0.1)',
                borderWidth: active ? 0 : 1,
                borderColor: 'rgba(124,92,252,0.4)',
                shadowColor: active ? '#7C5CFC' : 'transparent',
                shadowOpacity: active ? 0.7 : 0,
                shadowRadius: active ? 8 : 0,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
          </Pressable>
        )
      })}
      <Text style={styles.selectorLabel}>{EFFORT_LABELS[value - 1]}</Text>
    </View>
  )
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const tasks = useTaskStore((s) => s.tasks)
  const updateTask = useTaskStore((s) => s.updateTask)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const toggleComplete = useTaskStore((s) => s.toggleComplete)

  const task = tasks.find((t) => t.id === id)

  // Local editable state — initialized from task
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? new Date().toISOString())
  const [importance, setImportance] = useState<Importance>(task?.importance ?? 3)
  const [effort, setEffort] = useState<Effort>(task?.effort ?? 2)
  const [showCalendar, setShowCalendar] = useState(false)

  // Auto-save helper
  const save = useCallback(
    (updates: Partial<{ title: string; description: string; dueDate: string; importance: Importance; effort: Effort }>) => {
      if (!id) return
      updateTask(id, updates)
    },
    [id, updateTask]
  )

  const handleTitleChange = useCallback(
    (text: string) => {
      setTitle(text)
      save({ title: text })
    },
    [save]
  )

  const handleDescriptionChange = useCallback(
    (text: string) => {
      setDescription(text)
      save({ description: text })
    },
    [save]
  )

  const handleDateSelect = useCallback((date: Date) => {
    const iso = date.toISOString()
    setDueDate(iso)
    save({ dueDate: iso })
  }, [save])

  const handlePushBack = useCallback((days: number) => {
    const base = new Date(dueDate)
    // Push from current due date, not from today
    base.setDate(base.getDate() + days)
    const iso = base.toISOString()
    setDueDate(iso)
    save({ dueDate: iso })
  }, [dueDate, save])

  const handleImportanceChange = useCallback(
    (v: Importance) => {
      setImportance(v)
      save({ importance: v })
    },
    [save]
  )

  const handleEffortChange = useCallback(
    (v: Effort) => {
      setEffort(v)
      save({ effort: v })
    },
    [save]
  )

  const handleDelete = useCallback(() => {
    if (!id) return
    deleteTask(id)
    router.back()
  }, [id, deleteTask, router])

  const handleToggleComplete = useCallback(() => {
    if (!id) return
    toggleComplete(id)
  }, [id, toggleComplete])

  if (!task) {
    return (
      <View style={styles.container} testID="task-detail-not-found">
        <LinearGradient colors={['#06060F', '#0A0A1A']} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top', 'bottom']} style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Task not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backButtonFallback}>
            <Text style={styles.backButtonFallbackText}>Go back</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    )
  }

  const isCompleted = task.completed

  return (
    <View style={styles.container} testID="task-detail-screen">
      <LinearGradient
        colors={['#06060F', '#0A0A1A', '#0D0B1F']}
        style={StyleSheet.absoluteFill}
      />

      {/* Stars */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: 30 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                left: `${(i * 41 + 11) % 100}%` as any,
                top: `${(i * 67 + 17) % 100}%` as any,
                opacity: 0.1 + (i % 5) * 0.06,
                width: i % 4 === 0 ? 2 : 1,
                height: i % 4 === 0 ? 2 : 1,
              },
            ]}
          />
        ))}
      </View>

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        {/* Nav bar */}
        <View style={styles.navBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            testID="back-button"
          >
            <ChevronLeft size={24} color="#fff" strokeWidth={2} />
          </Pressable>

          <Pressable
            onPress={handleToggleComplete}
            style={({ pressed }) => [
              styles.completeButton,
              isCompleted && styles.completeButtonActive,
              pressed && styles.completeButtonPressed,
            ]}
            testID="complete-toggle-button"
          >
            <Check size={18} color={isCompleted ? '#0A0A0F' : '#4ADE80'} strokeWidth={2.5} />
            <Text style={[styles.completeButtonText, isCompleted && styles.completeButtonTextActive]}>
              {isCompleted ? 'Done' : 'Mark done'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero orb */}
          <View style={styles.heroArea}>
            <TaskOrb importance={importance} effort={effort} />
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <TextInput
              value={title}
              onChangeText={handleTitleChange}
              placeholder="Task title"
              placeholderTextColor="rgba(255,255,255,0.2)"
              style={[styles.titleInput, isCompleted && styles.titleInputCompleted]}
              multiline
              returnKeyType="done"
              blurOnSubmit
              testID="task-title-input"
            />
          </View>

          {/* Fields */}
          <View style={styles.fieldsContainer}>
            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NOTES</Text>
              <TextInput
                value={description}
                onChangeText={handleDescriptionChange}
                placeholder="Add a description..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                style={styles.descriptionInput}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="task-description-input"
              />
            </View>

            {/* Due date */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DUE DATE</Text>
              <Pressable
                onPress={() => setShowCalendar(true)}
                style={({ pressed }) => [styles.dueDateButton, pressed && styles.dueDateButtonPressed]}
                testID="due-date-button"
              >
                <Text style={styles.dueDateText}>{formatDate(dueDate)}</Text>
                <CalendarDays size={16} color="rgba(196,181,253,0.7)" />
              </Pressable>
              <View style={styles.pushBackRow}>
                {[
                  { label: '+1 day', days: 1 },
                  { label: '+3 days', days: 3 },
                  { label: '+1 week', days: 7 },
                  { label: '+2 weeks', days: 14 },
                  { label: '+1 month', days: 30 },
                ].map(({ label, days }) => (
                  <Pressable
                    key={label}
                    onPress={() => handlePushBack(days)}
                    style={({ pressed }) => [styles.pushBackChip, pressed && styles.pushBackChipPressed]}
                  >
                    <Text style={styles.pushBackChipText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Importance */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>IMPORTANCE</Text>
              <ImportanceSelector value={importance} onChange={handleImportanceChange} />
            </View>

            {/* Effort */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>EFFORT</Text>
              <EffortSelector value={effort} onChange={handleEffortChange} />
            </View>
          </View>

          {/* Delete button */}
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
            testID="delete-task-button"
          >
            <Trash2 size={16} color="#F87171" strokeWidth={2} />
            <Text style={styles.deleteButtonText}>Delete task</Text>
          </Pressable>

          <View style={{ height: 16 }} />
        </ScrollView>
      </SafeAreaView>

      <CalendarPicker
        visible={showCalendar}
        selectedDate={new Date(dueDate)}
        onSelect={handleDateSelect}
        onClose={() => setShowCalendar(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  safeArea: {
    flex: 1,
  },
  star: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: '#fff',
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  notFoundText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
  },
  backButtonFallback: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  backButtonFallbackText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: '#fff',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(74,222,128,0.4)',
    backgroundColor: 'rgba(74,222,128,0.07)',
  },
  completeButtonActive: {
    backgroundColor: '#4ADE80',
    borderColor: '#4ADE80',
  },
  completeButtonPressed: {
    opacity: 0.7,
  },
  completeButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: '#4ADE80',
  },
  completeButtonTextActive: {
    color: '#0A0A0F',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    minHeight: 180,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  titleInput: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 30,
    color: '#fff',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  titleInputCompleted: {
    color: 'rgba(255,255,255,0.35)',
    textDecorationLine: 'line-through',
  },
  fieldsContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 4,
  },
  fieldGroup: {
    marginBottom: 28,
  },
  fieldLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  descriptionInput: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
    lineHeight: 22,
  },
  dueDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dueDateButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  dueDateText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: '#fff',
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  selectorDotWrapper: {},
  selectorLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(248,113,113,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  deleteButtonPressed: {
    backgroundColor: 'rgba(248,113,113,0.14)',
  },
  deleteButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: '#F87171',
  },
  pushBackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  pushBackChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(124,92,252,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.3)',
  },
  pushBackChipPressed: {
    backgroundColor: 'rgba(124,92,252,0.25)',
  },
  pushBackChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: '#C4B5FD',
  },
})
