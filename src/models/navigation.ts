import { NAV_LABEL } from '../locales/ko'
import type { AppSettings, ExerciseId } from '../storage/settings'

export type AppView = 'plank' | 'squat' | 'pushup' | 'deadhang' | 'dumbbell' | 'overview' | 'settings'

export interface NavItemMeta {
  view: AppView
  label: string
}

export const ALL_NAV_VIEWS: readonly AppView[] = ['plank', 'squat', 'pushup', 'deadhang', 'dumbbell', 'overview', 'settings']

export const ALL_NAV_ITEMS: readonly NavItemMeta[] = [
  { view: 'plank', label: NAV_LABEL.plank },
  { view: 'squat', label: NAV_LABEL.squat },
  { view: 'pushup', label: NAV_LABEL.pushup },
  { view: 'deadhang', label: NAV_LABEL.deadhang },
  { view: 'dumbbell', label: NAV_LABEL.dumbbell },
  { view: 'overview', label: NAV_LABEL.overview },
  { view: 'settings', label: NAV_LABEL.settings },
]

export const EXERCISE_VIEW_MAP: Record<ExerciseId, AppView> = {
  plank: 'plank',
  squat: 'squat',
  pushup: 'pushup',
  deadhang: 'deadhang',
  dumbbell: 'dumbbell',
}

export function getActiveNavViews(settings: AppSettings): AppView[] {
  return ALL_NAV_VIEWS.filter((v) => {
    if (v === 'overview' || v === 'settings') return true
    const exerciseId = Object.entries(EXERCISE_VIEW_MAP).find(([, view]) => view === v)?.[0] as ExerciseId | undefined
    if (!exerciseId) return true
    return settings.exercises[exerciseId].enabled
  })
}

export function getActiveNavItems(settings: AppSettings): NavItemMeta[] {
  const activeViews = getActiveNavViews(settings)
  return ALL_NAV_ITEMS.filter((item) => activeViews.includes(item.view))
}

export function isWorkoutView(view: AppView): boolean {
  return view === 'plank' || view === 'squat' || view === 'pushup' || view === 'deadhang' || view === 'dumbbell'
}

export function isScrollableView(view: AppView): boolean {
  return view === 'overview' || view === 'settings'
}

export function isSwipeIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('input,button,label,textarea,select,a,[data-swipe-ignore="true"]') !== null
}
