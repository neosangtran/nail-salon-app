import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type KPIColorVariant = 'rose' | 'gold' | 'green' | 'blue' | 'indigo';

interface RevenueKPICardProps {
  title: string;
  value: string;
  change: number | null;
  icon: ReactNode;
  colorVariant?: KPIColorVariant;
  loading?: boolean;
}

const variantStyles: Record<KPIColorVariant, { iconBg: string; iconText: string; border: string }> = {
  rose:   { iconBg: 'bg-primary-50', iconText: 'text-primary-500', border: 'border-primary-100' },
  gold:   { iconBg: 'bg-gold-50',    iconText: 'text-gold-500',    border: 'border-gold-100'    },
  green:  { iconBg: 'bg-green-50',   iconText: 'text-green-500',   border: 'border-green-100'   },
  blue:   { iconBg: 'bg-blue-50',    iconText: 'text-blue-500',    border: 'border-blue-100'    },
  indigo: { iconBg: 'bg-indigo-50',  iconText: 'text-indigo-500',  border: 'border-indigo-100'  },
};

function ChangeIndicator({ change }: { change: number | null }) {
  if (change === null) return null;

  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-400">
        <Minus size={12} />
        0%
      </span>
    );
  }

  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-green-600">
        <TrendingUp size={13} />
        +{change.toFixed(1)}%
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-500">
      <TrendingDown size={13} />
      {change.toFixed(1)}%
    </span>
  );
}

export default function RevenueKPICard({
  title,
  value,
  change,
  icon,
  colorVariant = 'rose',
  loading = false,
}: RevenueKPICardProps) {
  const styles = variantStyles[colorVariant];

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div
          className={`${styles.iconBg} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}
        >
          <span className={styles.iconText}>{icon}</span>
        </div>
        <ChangeIndicator change={change} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
          {title}
        </p>
        {loading ? (
          <div className="mt-1.5 h-8 w-32 bg-gray-100 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-gray-800 mt-0.5 truncate">{value}</p>
        )}
      </div>

      {change !== null && !loading && (
        <p className="text-[11px] text-gray-400 leading-tight">
          {change >= 0 ? 'Up' : 'Down'} vs previous period
        </p>
      )}
    </div>
  );
}
