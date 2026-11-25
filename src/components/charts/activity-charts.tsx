'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { DailyMetric, ContributionBreakdown } from '@/types';

export function ActivityTrendChart({
  data,
  title = 'Activity Trend',
}: {
  data: DailyMetric[];
  title?: string;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{title}</span>
        <button
          type="button"
          onClick={() => setShowTable((s) => !s)}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          {showTable ? 'Show Chart' : 'Accessible Table'}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-56 overflow-auto rounded border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Total Events</th>
                <th className="px-3 py-2">PRs Opened</th>
                <th className="px-3 py-2">PRs Merged</th>
                <th className="px-3 py-2">Reviews</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.slice(-14).map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-1.5 font-mono">{d.date}</td>
                  <td className="px-3 py-1.5">{d.totalEvents}</td>
                  <td className="px-3 py-1.5">{d.prsOpened}</td>
                  <td className="px-3 py-1.5">{d.prsMerged}</td>
                  <td className="px-3 py-1.5">{d.reviewsSubmitted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-56 w-full" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.slice(-21)} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="indigoFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tealFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="totalEvents"
                name="Total Events"
                stroke="#4F46E5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#indigoFill)"
              />
              <Area
                type="monotone"
                dataKey="reviewsSubmitted"
                name="PR Reviews"
                stroke="#0D9488"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#tealFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function ContributionDistributionChart({
  data,
}: {
  data: ContributionBreakdown[];
}) {
  return (
    <div className="space-y-2">
      <div className="h-44 w-full" aria-label="Observed eligible GitHub activity distribution">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis
              type="category"
              dataKey="githubLogin"
              width={90}
              tick={{ fontSize: 11, fill: '#0F172A' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="totalEvents" name="Eligible Events" fill="#4F46E5" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-slate-500">
        Note: Shows observed eligible GitHub activity only (excludes bots), not total student effort.
      </p>
    </div>
  );
}
