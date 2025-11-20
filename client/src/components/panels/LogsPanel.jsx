import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const levelBadge = {
  info: { colorScheme: 'cyan', label: 'Info' },
  warn: { colorScheme: 'orange', label: 'Warn' },
  error: { colorScheme: 'red', label: 'Error' },
};

export default function LogsPanel({ logs, onClear }) {
  return (
    <Card className="p-6 bg-brand-surface border-brand-border shadow-xl rounded-3xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          Client Logs
        </h2>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="space-y-3">
        {logs.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No logs yet.
          </p>
        ) : (
          logs.map((entry) => {
            const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
            const badgeProps = levelBadge[entry.level] ?? levelBadge.info;
            return (
              <div
                key={entry.id}
                className="flex p-3 items-center justify-between rounded-md bg-white/5 border border-white/10"
              >
                <div className="space-y-0">
                  <p className="text-sm text-gray-300">
                    {entry.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    {time}
                  </p>
                </div>
                <Badge variant={badgeProps.colorScheme === 'red' ? 'destructive' : 'secondary'} className={badgeProps.colorScheme === 'cyan' ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30' : badgeProps.colorScheme === 'orange' ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30' : ''}>
                  {badgeProps.label}
                </Badge>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
