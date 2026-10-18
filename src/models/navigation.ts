import { NAV_LABEL } from '../locales/ko'
import { ALL_EXERCISES, type AppSettings, type ExerciseId } from '../storage/settings'

export type AppTab = 'today' | 'history' | 'settings'
export type AppView = ExerciseId | AppTab

export interface NavItemMeta {
  tab: AppTab
  label: string
}

export const TAB_ITEMS: readonly NavItemMeta[] = [
  { tab: 'today', label: NAV_LABEL.today },
  { tab: 'history', label: NAV_LABEL.history },
  { tab: 'settings', label: NAV_LABEL.settings },
]

export function getEnabledExerciseViews(settings: AppSettings): ExerciseId[] {
  return ALL_EXERCISES.filter((id) => settings.exercises[id].enabled)
}

export function isWorkoutView(view: AppView): view is ExerciseId {
  return (ALL_EXERCISES as readonly AppView[]).includes(view)
}

// Exercise detail screens belong to the 오늘 운동 tab.
export function getActiveTab(view: AppView): AppTab {
  return isWorkoutView(view) ? 'today' : view
}

export function resolveView(view: AppView, settings: AppSettings): AppView {
  if (!isWorkoutView(view)) return view
  return settings.exercises[view].enabled ? view : 'today'
}

export function isScrollableView(view: AppView): boolean {
  return !isWorkoutView(view)
}

export function isSwipeIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('input,button,label,textarea,select,a,[data-swipe-ignore="true"]') !== null
}
