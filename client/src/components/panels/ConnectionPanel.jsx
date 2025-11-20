import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function ConnectionPanel({
  form,
  status,
  handleInput,
  handleConnect,
  handleDisconnect,
  disableInputs,
  connectionCollapsed,
  setConnectionCollapsed,
  connected,
  isConnecting,
  authenticated,
}) {
  return (
    <Card className="p-6 bg-brand-surface border-brand-border shadow-xl rounded-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">
            Connection
          </h2>
          <p className="text-sm text-gray-400">
            {connected ? `Connected to ${form.username}@${form.host}` : 'Fill in the fields to start a session.'}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setConnectionCollapsed((prev) => !prev)}>
          {connectionCollapsed ? 'Expand' : 'Collapse'}
        </Button>
      </div>

      {connectionCollapsed ? (
        <div className="rounded-2xl border border-brand-border p-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-300">
              {connected ? 'Session active' : 'Collapsed — connect to expand the form.'}
            </p>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setConnectionCollapsed(false)}>
              Show controls
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleConnect}>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                name="host"
                value={form.host}
                onChange={handleInput}
                disabled={disableInputs}
                required
                placeholder="e.g., 192.168.1.10"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                min="1"
                max="65535"
                name="port"
                value={form.port}
                onChange={handleInput}
                disabled={disableInputs}
                placeholder="22"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                value={form.username}
                onChange={handleInput}
                disabled={disableInputs}
                required
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleInput}
                disabled={disableInputs}
                required
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700"
                disabled={disableInputs || !authenticated}
              >
                {isConnecting && <span className="animate-spin mr-2">⏳</span>}
                {connected ? 'Connected' : 'Connect'}
              </Button>
              <Button variant="ghost" disabled={!connected} onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>
          </div>
        </form>
      )}

      {!authenticated && !connectionCollapsed && (
        <p className="mt-4 text-sm text-orange-300">
          Log in to unlock SSH connectivity.
        </p>
      )}

      <Separator className="my-4 bg-white/10" />
      <p className="text-sm">
        <span className="font-semibold">
          Status:
        </span>{' '}
        {status}
      </p>
    </Card>
  );
}
