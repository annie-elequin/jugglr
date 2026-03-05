import { useEffect } from 'react'
import { useSharedValue, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated'
import { getBallRadius, type Task } from '@/lib/state/tasks'

export interface BallAnimState {
  floatY: ReturnType<typeof useSharedValue<number>>
  radius: number
}

export function useBallAnimation(
  task: Task,
  effort: number,
  index: number
): BallAnimState {
  const radius = getBallRadius(effort as 1 | 2 | 3 | 4 | 5)
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

    return () => {
      floatY.value = 0
    }
  }, [index])

  return { floatY, radius }
}
