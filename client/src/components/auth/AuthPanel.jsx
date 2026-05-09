import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { MIN_ACCOUNT_PASSWORD_LENGTH } from '@/lib/authPolicy';

const loginInitial = { identifier: '', password: '' };
const registerInitial = { username: '', email: '', password: '' };

export default function AuthPanel({ user, status, loading, onLogin, onRegister, onLogout }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(loginInitial);
  const [registerForm, setRegisterForm] = useState(registerInitial);

  const isLogin = mode === 'login';
  const registerPasswordTooShort = !isLogin && registerForm.password.length < MIN_ACCOUNT_PASSWORD_LENGTH;

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (isLogin) {
      setLoginForm((prev) => ({ ...prev, [name]: value }));
    } else {
      setRegisterForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isLogin) {
      onLogin(loginForm);
    } else {
      onRegister(registerForm);
    }
  };

  return (
    <div className="w-full">
      <div className="flex w-full mb-6 border border-purple-500/50 rounded-md overflow-hidden">
        <Button
          variant="ghost"
          onClick={() => setMode('login')}
          className={`flex-1 rounded-none ${isLogin ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10'}`}
        >
          Login
        </Button>
        <Button
          variant="ghost"
          onClick={() => setMode('register')}
          className={`flex-1 rounded-none ${!isLogin ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10'}`}
        >
          Register
        </Button>
      </div>

      {user ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">
            Signed in as
          </p>
          <p className="text-lg font-bold">
            {user.username}
          </p>
          <p className="text-sm text-gray-300">
            {user.email}
          </p>
          <Button size="sm" onClick={onLogout} disabled={loading} className="mt-2">
            Logout
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {isLogin ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="identifier">Username or email</Label>
                  <Input
                    id="identifier"
                    name="identifier"
                    value={loginForm.identifier}
                    onChange={handleChange}
                    placeholder="username / email"
                    autoComplete="username"
                    required
                    disabled={loading}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    name="password"
                    value={loginForm.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    value={registerForm.username}
                    onChange={handleChange}
                    autoComplete="username"
                    required
                    disabled={loading}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={registerForm.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                    disabled={loading}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    name="password"
                    value={registerForm.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    minLength={MIN_ACCOUNT_PASSWORD_LENGTH}
                    aria-describedby="reg-password-help"
                    required
                    disabled={loading}
                    className="bg-white/5 border-white/10"
                  />
                  <p id="reg-password-help" className="text-xs text-gray-400">
                    At least {MIN_ACCOUNT_PASSWORD_LENGTH} characters.
                  </p>
                </div>
              </>
            )}
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading || registerPasswordTooShort}>
              {isLogin ? 'Sign in' : 'Create account'}
            </Button>
          </div>
        </form>
      )}

      {status && (
        <Alert className="mt-4 bg-blue-500/10 text-blue-200 border-blue-500/20">
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
