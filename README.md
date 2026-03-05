# Jugglr

A unique task tracking app where tasks are visualized as juggling balls in motion.

## What is Jugglr?

Jugglr reimagines task management through a physics-based visual metaphor. Instead of flat lists and checkboxes, your tasks become animated balls bouncing on screen. At a glance, you can see which tasks are urgent, which are important, and how much effort each requires — all without reading a single label.

## How It Works

Each task is represented as a ball with three visual properties:

- **Height (Urgency)** — A task's vertical position on screen is determined by its due date. The closer the deadline, the lower the ball sits. Tasks with no due date float near the top.
- **Color (Importance, 1–5)** — Ball color maps from blue (low importance) through green, yellow, and orange to red (high importance). Important tasks stand out immediately.
- **Size (Effort, 1–5)** — Ball diameter reflects how much work a task requires. Small balls are quick wins; large balls signal heavy lifts.

## Key Features

- **Physics-based animation** — Balls move with realistic bouncing motion rendered via React Native Skia.
- **Urgency positioning** — Due date determines ball height in real time; as deadlines approach, balls drift lower on screen.
- **Importance coloring** — Five-level color scale (blue to red) gives instant visual priority cues.
- **Effort sizing** — Five size levels (small to large) communicate task weight at a glance.
- **Subtask support** — Tasks support unlimited nesting. Break any task into subtasks, which can themselves have subtasks.
- **Flexible effort on parent tasks** — A parent task's effort can be set manually or calculated automatically as the sum of its children's effort.
- **Toggle subtask visibility** — Show or hide subtasks on the main screen to control visual density.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 53 / React Native 0.76 |
| Rendering | React Native Skia (ball drawing) |
| Animation | React Native Reanimated v3 |
| State | Zustand |
| Persistence | MMKV |
| Navigation | Expo Router |
| Styling | NativeWind + Tailwind v3 |

## Project Structure

```
mobile/   — Expo React Native app (port 8081)
backend/  — Hono API server (port 3000)
```
