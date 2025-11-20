import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function TerminalPanel({ termContainerRef, username, host, connected, onExport, fullHeight }) {
  return (
    <Card className={`p-6 bg-brand-surface border-brand-border shadow-xl rounded-3xl flex flex-col ${fullHeight ? 'h-full' : ''}`}>
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">
            Terminal
          </h2>
          {!connected && username && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              Disconnected
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-400 hidden sm:block">
            {username && host ? `${username}@${host}` : 'Not connected'}
          </p>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <Download size={14} />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport('txt')}>
                Text (.txt)
              </DropdownMenuItem>
              {/* Future support for other formats */}
              <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                HTML (.html) (Coming soon)
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                PDF (.pdf) (Coming soon)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div
        ref={termContainerRef}
        tabIndex={0}
        className={`w-full bg-brand-bg rounded-xl overflow-hidden border transition-colors duration-300 ${fullHeight ? 'flex-1 min-h-0' : 'h-[400px]'
          } ${connected ? 'border-brand-border' : 'border-red-500/20 opacity-90'}`}
      />
    </Card>
  );
}
