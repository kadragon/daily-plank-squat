import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import TodayWorkout, { type TodayExerciseCard } from './today-workout'

const plankCard: TodayExerciseCard = {
  id: 'plank',
  label: '플랭크',
  actual: '63초',
  target: '60초',
  completed: true,
  recommendationText: '내일 추천: 63초 (+3초)',
}

const squatCard: TodayExerciseCard = {
  id: 'squat',
  label: '스쿼트',
  actual: '12회',
  target: '20회',
  completed: false,
}

test('TodayWorkout shows progress as completed / enabled count', () => {
  const html = renderToStaticMarkup(<TodayWorkout exercises={[plankCard, squatCard]} />)

  expect(html).toContain('1 / 2 완료')
  expect(html).toMatch(/<progress max="2" value="1"/)
})

test('TodayWorkout renders one card per exercise with actual / target', () => {
  const html = renderToStaticMarkup(<TodayWorkout exercises={[plankCard, squatCard]} />)

  expect((html.match(/class="exercise-card[ "]/g) ?? []).length).toBe(2)
  expect(html).toContain('63초 / 60초')
  expect(html).toContain('12회 / 20회')
})

test('TodayWorkout marks completed cards and shows tomorrow recommendation only when provided', () => {
  const html = renderToStaticMarkup(<TodayWorkout exercises={[plankCard, squatCard]} />)

  expect(html).toContain('exercise-card exercise-card--completed')
  expect((html.match(/exercise-card__done/g) ?? []).length).toBe(1)
  expect((html.match(/exercise-card__recommendation/g) ?? []).length).toBe(1)
  expect(html).toContain('내일 추천: 63초 (+3초)')
})

test('TodayWorkout card accessible name includes value, completion, and recommendation', () => {
  const html = renderToStaticMarkup(<TodayWorkout exercises={[plankCard, squatCard]} />)

  expect(html).toContain('aria-label="플랭크 열기, 63초 / 60초, 완료, 내일 추천: 63초 (+3초)"')
  expect(html).toContain('aria-label="스쿼트 열기, 12회 / 20회"')
})

test('TodayWorkout hides per-card tomorrow recommendation on recovery day', () => {
  const html = renderToStaticMarkup(<TodayWorkout exercises={[plankCard]} tomorrowDayType="recovery" />)

  expect(html).not.toContain('내일 추천: 63초 (+3초)')
  expect(html).toContain('recovery-guide-item')
})

test('TodayWorkout shows fatigue and tomorrow day type banners', () => {
  const html = renderToStaticMarkup(<TodayWorkout fatigue={0.4567} tomorrowDayType="training" />)

  expect(html).toContain('피로도: 0.457')
  expect(html).toContain('day-type-training')
  expect(html).not.toContain('recovery-guide')
})

test('TodayWorkout shows recovery guide on recovery day', () => {
  const html = renderToStaticMarkup(<TodayWorkout tomorrowDayType="recovery" />)

  expect(html).toContain('회복일')
  expect(html).toContain('recovery-guide-item')
})

test('TodayWorkout warning banners have role="alert"', () => {
  const html = renderToStaticMarkup(<TodayWorkout overloadWarning suspiciousSession />)

  expect((html.match(/role="alert"/g) ?? []).length).toBe(2)
  expect(html).toContain('경고: 운동 부하가 상위 5%를 넘었습니다')
  expect(html).toContain('경고: 측정 환경이 불안정합니다')
})

test('TodayWorkout shows an empty notice when no exercise is enabled', () => {
  const html = renderToStaticMarkup(<TodayWorkout exercises={[]} />)

  expect(html).toContain('활성화된 운동이 없습니다')
  expect(html).toContain('0 / 0 완료')
})

test('TodayWorkout disables Apple Health export when unavailable', () => {
  const html = renderToStaticMarkup(<TodayWorkout healthExportEnabled={false} />)

  expect(html).toContain('Apple 건강에 기록')
  expect(html).toContain('disabled')
})

test('TodayWorkout enables Apple Health export without emphasis until every exercise is completed', () => {
  const html = renderToStaticMarkup(
    <TodayWorkout exercises={[plankCard, squatCard]} healthExportEnabled onExportToHealth={() => {}} />,
  )

  expect(html).not.toContain('disabled')
  expect(html).toContain('btn btn--secondary')
  expect(html).not.toContain('today-workout__export--emphasized')
})

test('TodayWorkout emphasizes Apple Health export once every enabled exercise is completed', () => {
  const html = renderToStaticMarkup(
    <TodayWorkout
      exercises={[plankCard, { ...squatCard, completed: true }]}
      healthExportEnabled
      onExportToHealth={() => {}}
    />,
  )

  expect(html).toContain('btn btn--primary today-workout__export--emphasized')
})

test('TodayWorkout renders health export hint when provided', () => {
  const html = renderToStaticMarkup(<TodayWorkout healthExportHint="기록은 가능하지만 측정 환경 경고" />)

  expect(html).toContain('기록은 가능하지만 측정 환경 경고')
})
