'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ReferenceLine, Cell,
} from 'recharts'
import { AlertCircle, TrendingUp, Users, FileText, GraduationCap } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface EnrolmentPoint {
  month: string
  [key: string]: number | string
}

interface CompletionPoint {
  course_title: string
  enrolled:     number
  completed:    number
  rate:         number
}

interface WeeklyPoint {
  week:  string
  count: number
}

interface AvgBandPoint {
  course_title: string
  avg_band:     number
}

interface AnalyticsData {
  enrolments:  EnrolmentPoint[]
  completions: CompletionPoint[]
  weekly:      WeeklyPoint[]
  avgBands:    AvgBandPoint[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bandFill(avg: number): string {
  if (avg > 6.5)  return '#22c55e'  // green-500
  if (avg >= 5.5) return '#f59e0b'  // amber-500
  return '#ef4444'                   // red-500
}

function shortTitle(title: string, max = 22): string {
  return title.length > max ? title.slice(0, max - 1) + '…' : title
}

const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: '10px',
  border:       '1px solid #e2e8f0',
  fontSize:     '12px',
  boxShadow:    '0 2px 8px rgba(0,0,0,0.08)',
}

const BRANCH_COLORS: Record<string, string> = {
  HAN: '#3b82f6',
  HCM: '#22c55e',
}

function branchColor(code: string, idx: number): string {
  const fallback = ['#8b5cf6', '#f59e0b', '#06b6d4']
  return BRANCH_COLORS[code] ?? fallback[idx % fallback.length]
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3 pt-2">
      <div className="h-3 bg-slate-200 rounded w-1/4" />
      <div className="h-48 bg-slate-100 rounded-xl" />
      <div className="flex gap-4">
        <div className="h-3 bg-slate-200 rounded w-16" />
        <div className="h-3 bg-slate-200 rounded w-16" />
      </div>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="h-48 flex items-center justify-center text-sm text-slate-400">
      No data available yet.
    </div>
  )
}

// ── ChartCard ─────────────────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  loading,
  children,
}: {
  title:    string
  subtitle: string
  icon:     React.ElementType
  loading:  boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start gap-2 mb-1">
        <Icon size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4">
        {loading ? <ChartSkeleton /> : children}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [data,    setData]    = useState<AnalyticsData>({
    enrolments:  [],
    completions: [],
    weekly:      [],
    avgBands:    [],
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/enrolments').then(r => r.json()),
      fetch('/api/analytics/completions').then(r => r.json()),
      fetch('/api/analytics/submissions').then(r => r.json()),
    ])
      .then(([enrol, compl, subs]) => {
        if (!enrol.success || !compl.success || !subs.success) {
          throw new Error(
            enrol.error ?? compl.error ?? subs.error ?? 'Failed to load analytics.'
          )
        }
        setData({
          enrolments:  enrol.data             as EnrolmentPoint[],
          completions: compl.data             as CompletionPoint[],
          weekly:      subs.data.weekly       as WeeklyPoint[],
          avgBands:    subs.data.avgBands     as AvgBandPoint[],
        })
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load analytics data.')
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Error state ────────────────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
      >
        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="font-semibold">Could not load analytics</p>
          <p className="mt-0.5 text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  // Derive branch codes from data for dynamic grouped bars
  const branchCodes = Array.from(
    new Set(data.enrolments.flatMap(d => Object.keys(d).filter(k => k !== 'month')))
  )

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enrolment trends, course completions, and submission performance
        </p>
      </div>

      {/* ── 2-col chart grid ── */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* ── (a) Enrolment Trend ── */}
        <ChartCard
          title="Enrolment Trend"
          subtitle="New enrolments per month, by branch"
          icon={Users}
          loading={loading}
        >
          {data.enrolments.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.enrolments} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {branchCodes.map((code, i) => (
                  <Bar
                    key={code}
                    dataKey={code}
                    fill={branchColor(code, i)}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* ── (b) Course Completion Rates — horizontal ── */}
        <ChartCard
          title="Course Completion Rates"
          subtitle="% of enrolled learners who finished each course"
          icon={GraduationCap}
          loading={loading}
        >
          {data.completions.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer
              width="100%"
              height={Math.max(240, data.completions.length * 52)}
            >
              <BarChart
                data={data.completions}
                layout="vertical"
                margin={{ top: 4, right: 36, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="course_title"
                  width={150}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={t => shortTitle(t)}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) =>
                    name === 'rate' ? [`${value ?? ''}%`, 'Completion rate'] : [value ?? '', String(name)]
                  }
                />
                <ReferenceLine
                  x={70}
                  stroke="#f59e0b"
                  strokeDasharray="4 3"
                  label={{
                    value:    '70%',
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill:     '#f59e0b',
                    dy:       -6,
                  }}
                />
                <Bar
                  dataKey="rate"
                  name="Completion %"
                  fill="#6366f1"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* ── (c) Submission Volume ── */}
        <ChartCard
          title="Submission Volume"
          subtitle="Total submissions per week — last 8 weeks"
          icon={FileText}
          loading={loading}
        >
          {data.weekly.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.weekly} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Submissions"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* ── (d) Avg AI Band Score by Course ── */}
        <ChartCard
          title="Avg AI Band Score by Course"
          subtitle="Mean IELTS Writing band from AI-scored submissions"
          icon={TrendingUp}
          loading={loading}
        >
          {data.avgBands.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data.avgBands}
                margin={{ top: 4, right: 16, left: -10, bottom: 44 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="course_title"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  tickFormatter={t => shortTitle(t, 18)}
                />
                <YAxis
                  domain={[0, 9]}
                  ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [v ?? '', 'Avg Band']}
                />
                <ReferenceLine
                  y={6.5}
                  stroke="#6366f1"
                  strokeDasharray="4 3"
                  label={{
                    value:    '6.5',
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill:     '#6366f1',
                  }}
                />
                <Bar dataKey="avg_band" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {data.avgBands.map((entry, i) => (
                    <Cell key={i} fill={bandFill(entry.avg_band)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

      </div>
    </div>
  )
}
