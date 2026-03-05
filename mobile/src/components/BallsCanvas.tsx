import React, { useMemo, useRef, useEffect, useCallback } from 'react'
import { ScrollView, View, Text, useWindowDimensions } from 'react-native'
import {
  Canvas,
  Circle,
  Group,
  BlurMask,
} from '@shopify/react-native-skia'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
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

interface BallInfo {
  task: Task
  x: number
  y: number
  radius: number
  r: number
  g: number
  b: number
}

const BALL_COLORS_CACHE = new Map<number, { r: number; g: number; b: number }>()

function getBallColorCached(importance: number): { r: number; g: number; b: number } {
  if (!BALL_COLORS_CACHE.has(importance)) {
    BALL_COLORS_CACHE.set(importance, getBallColorRGB(importance as 1 | 2 | 3 | 4 | 5))
  }
  return BALL_COLORS_CACHE.get(importance)!
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
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const ballInfos = useMemo((): BallInfo[] => {
    const rootTasks = tasks.filter((t) => !t.parentId && !t.completed)
    const result: BallInfo[] = []

    for (const task of rootTasks) {
      const effort = getEffectiveEffort(task, tasks) as Effort
      const radius = getBallRadius(effort)
      const x = getStableX(task.id, screenWidth, radius)
      const y = getTaskY(task.dueDate, canvasHeight)
      const color = getBallColorCached(task.importance)
      result.push({ task, x, y, radius, ...color })

      if (task.showSubtasks) {
        const children = tasks.filter((t) => t.parentId === task.id && !t.completed)
        for (const child of children) {
          const childEffort = child.effort as Effort
          const childRadius = getBallRadius(childEffort)
          const childX = getStableX(child.id, screenWidth, childRadius)
          const childY = getTaskY(child.dueDate, canvasHeight)
          const childColor = getBallColorCached(child.importance)
          result.push({ task: child, x: childX, y: childY, radius: childRadius, ...childColor })
        }
      }
    }

    return result
  }, [tasks, screenWidth, canvasHeight])

  // Track scroll offset for hit testing
  const scrollOffsetRef = useRef(0)

  const ballInfosRef = useRef(ballInfos)
  ballInfosRef.current = ballInfos

  const handleTap = useCallback((tapX: number, tapY: number) => {
    const absoluteY = tapY + scrollOffsetRef.current
    const infos = ballInfosRef.current
    for (let i = infos.length - 1; i >= 0; i--) {
      const b = infos[i]
      const dist = Math.sqrt((tapX - b.x) ** 2 + (absoluteY - b.y) ** 2)
      if (dist <= b.radius + 14) {
        onTapTask(b.task.id)
        return
      }
    }
  }, [onTapTask])

  const handleLongPress = useCallback((tapX: number, tapY: number) => {
    const absoluteY = tapY + scrollOffsetRef.current
    const infos = ballInfosRef.current
    for (let i = infos.length - 1; i >= 0; i--) {
      const b = infos[i]
      const dist = Math.sqrt((tapX - b.x) ** 2 + (absoluteY - b.y) ** 2)
      if (dist <= b.radius + 14) {
        onLongPressTask(b.task.id)
        return
      }
    }
  }, [onLongPressTask])

  const tapGesture = Gesture.Tap().onEnd((e) => {
    runOnJS(handleTap)(e.x, e.y)
  })

  const longPressGesture = Gesture.LongPress().minDuration(500).onStart((e) => {
    runOnJS(handleLongPress)(e.x, e.y)
  })

  const composed = Gesture.Race(longPressGesture, tapGesture)

  return (
    <GestureDetector gesture={composed}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.y
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ height: canvasHeight }}
        testID="balls-canvas-native"
      >
        <View style={{ width: screenWidth, height: canvasHeight, position: 'relative' }}>
          <Canvas style={{ width: screenWidth, height: canvasHeight }}>
            {ballInfos.map((ball) => {
              const { r, g, b } = ball
              const color = `rgb(${r}, ${g}, ${b})`
              const glowColor = `rgba(${r}, ${g}, ${b}, 0.35)`
              const glowRadius = ball.radius * 2.2
              return (
                <Group key={ball.task.id}>
                  {/* Outer glow */}
                  <Circle cx={ball.x} cy={ball.y} r={glowRadius} color={glowColor}>
                    <BlurMask blur={glowRadius * 0.5} style="normal" />
                  </Circle>
                  {/* Inner glow */}
                  <Circle cx={ball.x} cy={ball.y} r={ball.radius * 1.3} color={`rgba(${r}, ${g}, ${b}, 0.5)`}>
                    <BlurMask blur={ball.radius * 0.4} style="normal" />
                  </Circle>
                  {/* Main ball */}
                  <Circle cx={ball.x} cy={ball.y} r={ball.radius} color={color} />
                  {/* Specular highlight */}
                  <Circle
                    cx={ball.x - ball.radius * 0.25}
                    cy={ball.y - ball.radius * 0.25}
                    r={ball.radius * 0.35}
                    color="rgba(255,255,255,0.4)"
                  />
                </Group>
              )
            })}
          </Canvas>
          {/* Timeline markers — rendered as absolutely positioned Views inside the scroll content */}
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
                    height: highlight ? 1 : 1,
                    backgroundColor: highlight ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                  }}
                />
              </View>
            )
          })}
          {showBallLabels ? ballInfos.map((ball) => (
            <Text
              key={`label-${ball.task.id}`}
              numberOfLines={1}
              style={{
                position: 'absolute',
                left: ball.x - 45,
                top: ball.y + ball.radius + 4,
                width: 90,
                textAlign: 'center',
                fontFamily: 'DMSans_500Medium',
                fontSize: 10,
                color: 'rgba(255,255,255,0.65)',
              }}
            >
              {ball.task.title}
            </Text>
          )) : null}
        </View>
      </ScrollView>
    </GestureDetector>
  )
}
