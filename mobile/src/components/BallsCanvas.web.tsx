import React, { useMemo, useRef, useEffect } from 'react'
import { View, ScrollView, Pressable, Text, useWindowDimensions } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import {
  useTaskStore,
  getBallColorRGB,
  getBallRadius,
  getEffectiveEffort,
  type Task,
  type Effort,
} from '@/lib/state/tasks'

const TIMELINE_DAYS = 180
const CANVAS_HEIGHT_MULTIPLIER = 4

interface BallsCanvasProps {
  onTapTask: (taskId: string) => void
  onLongPressTask: (taskId: string) => void
}

function getTaskY(dueDate: string, canvasHeight: number): number {
  const msLeft = new Date(dueDate).getTime() - Date.now()
  const daysLeft = Math.max(0, Math.min(TIMELINE_DAYS, msLeft / 86400000))
  const fraction = daysLeft / TIMELINE_DAYS
  // fraction=0 (due now) -> bottom; fraction=1 (due far) -> top
  const usableStart = canvasHeight * 0.02
  const usableEnd = canvasHeight * 0.95
  return usableEnd - fraction * (usableEnd - usableStart)
}

function getStableX(taskId: string, screenWidth: number, radius: number): number {
  let hash = 0
  for (let i = 0; i < taskId.length; i++) {
    hash = (hash * 31 + taskId.charCodeAt(i)) & 0xffffffff
  }
  const minX = radius + screenWidth * 0.05
  const maxX = screenWidth - radius - screenWidth * 0.05
  const range = Math.max(1, maxX - minX)
  return minX + (Math.abs(hash) % range)
}

function WebBall({
  task,
  x,
  y,
  radius,
  r,
  g,
  b,
  index,
  showLabel,
  onTapTask,
  onLongPressTask,
}: {
  task: Task
  x: number
  y: number
  radius: number
  r: number
  g: number
  b: number
  index: number
  showLabel: boolean
  onTapTask: (id: string) => void
  onLongPressTask: (id: string) => void
}) {
  const floatY = useSharedValue(0)

  useEffect(() => {
    const amplitude = 4
    const period = 3500 + (index % 4) * 600
    floatY.value = withRepeat(
      withSequence(
        withTiming(-amplitude, { duration: period / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(amplitude, { duration: period / 2, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true
    )
  }, [index])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))

  const color = `rgb(${r}, ${g}, ${b})`

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x - radius,
          top: y - radius,
          width: radius * 2,
          height: radius * 2,
        },
        animStyle,
      ]}
    >
      <Pressable
        testID={`ball-${task.id}`}
        onPress={() => onTapTask(task.id)}
        onLongPress={() => onLongPressTask(task.id)}
        style={{
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: radius * 0.8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Specular highlight */}
        <View
          style={{
            position: 'absolute',
            top: radius * 0.2,
            left: radius * 0.25,
            width: radius * 0.65,
            height: radius * 0.65,
            borderRadius: radius * 0.325,
            backgroundColor: 'rgba(255,255,255,0.35)',
          }}
        />
      </Pressable>
      {showLabel ? (
        <View style={{
          position: 'absolute',
          top: radius * 2 + 5,
          left: -40,
          right: -40,
          alignItems: 'center',
        }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 10,
              color: 'rgba(255,255,255,0.65)',
              textAlign: 'center',
            }}
          >
            {task.title}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  )
}

const TIMELINE_MARKERS = [
  { days: 0,   label: 'now',      highlight: true },
  { days: 7,   label: '1 week',   highlight: false },
  { days: 14,  label: '2 weeks',  highlight: false },
  { days: 30,  label: '1 month',  highlight: false },
  { days: 60,  label: '2 months', highlight: false },
  { days: 90,  label: '3 months', highlight: false },
  { days: 180, label: '6 months', highlight: false },
]

export default function BallsCanvas({ onTapTask, onLongPressTask }: BallsCanvasProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const tasks = useTaskStore((s) => s.tasks)
  const showBallLabels = useTaskStore((s) => s.showBallLabels)
  const scrollRef = useRef<ScrollView>(null)
  const canvasHeight = screenHeight * CANVAS_HEIGHT_MULTIPLIER

  // Scroll to bottom on mount so urgent (soon due) tasks are visible
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false })
    }, 150)
    return () => clearTimeout(timer)
  }, [])

  const ballInfos = useMemo(() => {
    const rootTasks = tasks.filter((t) => !t.parentId && !t.completed)
    const result: Array<{
      task: Task
      x: number
      y: number
      radius: number
      r: number
      g: number
      b: number
    }> = []

    for (const task of rootTasks) {
      const effort = getEffectiveEffort(task, tasks) as Effort
      const radius = getBallRadius(effort)
      const x = getStableX(task.id, screenWidth, radius)
      const y = getTaskY(task.dueDate, canvasHeight)
      const { r, g, b } = getBallColorRGB(task.importance)
      result.push({ task, x, y, radius, r, g, b })

      if (task.showSubtasks) {
        const children = tasks.filter((t) => t.parentId === task.id && !t.completed)
        for (const child of children) {
          const childEffort = child.effort as Effort
          const childRadius = getBallRadius(childEffort)
          const childX = getStableX(child.id, screenWidth, childRadius)
          const childY = getTaskY(child.dueDate, canvasHeight)
          const childColor = getBallColorRGB(child.importance)
          result.push({ task: child, x: childX, y: childY, radius: childRadius, ...childColor })
        }
      }
    }

    return result
  }, [tasks, screenWidth, canvasHeight])

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ height: canvasHeight }}
      testID="balls-canvas-web"
    >
      <View style={{ width: screenWidth, height: canvasHeight }}>
        {ballInfos.map((ball, index) => (
          <WebBall
            key={ball.task.id}
            task={ball.task}
            x={ball.x}
            y={ball.y}
            radius={ball.radius}
            r={ball.r}
            g={ball.g}
            b={ball.b}
            index={index}
            showLabel={showBallLabels}
            onTapTask={onTapTask}
            onLongPressTask={onLongPressTask}
          />
        ))}
        {/* Timeline markers */}
        {TIMELINE_MARKERS.map(({ days, label, highlight }) => {
          const markerDate = new Date(Date.now() + days * 86400000).toISOString()
          const y = getTaskY(markerDate, canvasHeight)
          return (
            <View
              key={label}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: y,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 10,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: highlight ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)',
                  minWidth: 54,
                }}
              >
                {label}
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: highlight ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                }}
              />
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}
