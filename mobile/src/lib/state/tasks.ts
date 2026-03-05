import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { MMKV } from 'react-native-mmkv'
import { api } from '../api/api'

const storage = new MMKV({ id: 'jugglr-settings' })

const mmkvStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name)
    return value ?? null
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value)
  },
  removeItem: (name: string) => {
    storage.delete(name)
  },
}

export type Importance = 1 | 2 | 3 | 4 | 5
export type Effort = 1 | 2 | 3 | 4 | 5

export interface Task {
  id: string
  title: string
  description?: string
  dueDate: string
  importance: Importance
  effort: Effort
  effortMode: 'manual' | 'cumulative'
  parentId?: string
  completed: boolean
  showSubtasks: boolean
  createdAt: string
}

interface TaskState {
  tasks: Task[]
  showBallLabels: boolean
  isLoaded: boolean
  setShowBallLabels: (value: boolean) => void
  fetchTasks: () => Promise<void>
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleComplete: (id: string) => Promise<void>
  toggleShowSubtasks: (id: string) => Promise<void>
}

// Settings-only store (persisted to MMKV)
interface SettingsState {
  showBallLabels: boolean
  setShowBallLabels: (value: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      showBallLabels: true,
      setShowBallLabels: (value: boolean) => set({ showBallLabels: value }),
    }),
    {
      name: 'jugglr-settings-store',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
)

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  showBallLabels: true,
  isLoaded: false,
  setShowBallLabels: (value: boolean) => set({ showBallLabels: value }),

  fetchTasks: async () => {
    try {
      const tasks = await api.get<Task[]>('/api/tasks')
      if (Array.isArray(tasks)) {
        set({ tasks, isLoaded: true })
      }
    } catch (e) {
      console.error('[TaskStore] fetchTasks error:', e)
      set({ isLoaded: true })
    }
  },

  addTask: async (task) => {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newTask: Task = {
      ...task,
      id,
      createdAt: new Date().toISOString(),
    }
    // Optimistic update
    set((state) => ({ tasks: [...state.tasks, newTask] }))
    try {
      const created = await api.post<Task>('/api/tasks', newTask)
      if (created) {
        // Replace optimistic entry with server response
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? created : t)),
        }))
      }
    } catch (e) {
      console.error('[TaskStore] addTask error:', e)
      // Revert on failure
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }))
    }
  },

  updateTask: async (id, updates) => {
    const prev = get().tasks.find((t) => t.id === id)
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
    try {
      await api.patch<Task>(`/api/tasks/${id}`, updates)
    } catch (e) {
      console.error('[TaskStore] updateTask error:', e)
      // Revert
      if (prev) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? prev : t)),
        }))
      }
    }
  },

  deleteTask: async (id) => {
    const prevTasks = get().tasks
    // Optimistic update - delete task and its children
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id && t.parentId !== id),
    }))
    try {
      await api.delete<void>(`/api/tasks/${id}`)
    } catch (e) {
      console.error('[TaskStore] deleteTask error:', e)
      // Revert
      set({ tasks: prevTasks })
    }
  },

  toggleComplete: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const updates = { completed: !task.completed }
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
    try {
      await api.patch<Task>(`/api/tasks/${id}`, updates)
    } catch (e) {
      console.error('[TaskStore] toggleComplete error:', e)
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? task : t)),
      }))
    }
  },

  toggleShowSubtasks: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const updates = { showSubtasks: !task.showSubtasks }
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
    try {
      await api.patch<Task>(`/api/tasks/${id}`, updates)
    } catch (e) {
      console.error('[TaskStore] toggleShowSubtasks error:', e)
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? task : t)),
      }))
    }
  },
}))

export function getEffectiveEffort(task: Task, allTasks: Task[]): Effort {
  if (task.effortMode === 'cumulative') {
    const children = allTasks.filter((t) => t.parentId === task.id)
    if (children.length > 0) {
      const total = children.reduce((sum, c) => sum + c.effort, 0)
      const avg = total / children.length
      return Math.max(1, Math.min(5, Math.round(avg))) as Effort
    }
  }
  return task.effort
}

export function getBallColor(importance: Importance): string {
  const hue = 220 - (importance - 1) * 55
  return `hsl(${hue}, 90%, 60%)`
}

export function getBallColorRGB(importance: Importance): { r: number; g: number; b: number } {
  const hue = 220 - (importance - 1) * 55
  const s = 0.9
  const l = 0.6
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0

  if (hue >= 0 && hue < 60) { r = c; g = x; b = 0 }
  else if (hue >= 60 && hue < 120) { r = x; g = c; b = 0 }
  else if (hue >= 120 && hue < 180) { r = 0; g = c; b = x }
  else if (hue >= 180 && hue < 240) { r = 0; g = x; b = c }
  else if (hue >= 240 && hue < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

export function getBallRadius(effort: Effort): number {
  return 24 + (effort - 1) * 14
}

export function getUrgencyFactor(dueDate: string): number {
  const daysLeft = (new Date(dueDate).getTime() - Date.now()) / 86400000
  return Math.max(0, Math.min(1, daysLeft / 30))
}
