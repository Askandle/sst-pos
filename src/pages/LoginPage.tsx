import React, { useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface FireflyConfig {
  id: number;
  size: number;
  duration: number;
  delay: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
  x5: number;
  y5: number;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateFireflies(): FireflyConfig[] {
  return Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: randomBetween(3, 7),
    duration: randomBetween(35, 65),
    delay: randomBetween(0, 3),
    x1: randomBetween(0, 100),
    y1: randomBetween(0, 100),
    x2: randomBetween(0, 100),
    y2: randomBetween(0, 100),
    x3: randomBetween(0, 100),
    y3: randomBetween(0, 100),
    x4: randomBetween(0, 100),
    y4: randomBetween(0, 100),
    x5: randomBetween(0, 100),
    y5: randomBetween(0, 100),
  }));
}

export default function LoginPage() {
  const [isOn, setIsOn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fireflySeed, setFireflySeed] = useState(0);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const dragState = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    dragX: 0,
    dragY: 0,
    downAt: 0,
  });

  const { signInWithUsername, signUpWithUsername } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from || '/';

  const fireflies = useMemo(() => {
    if (!isOn) return [];
    return generateFireflies();
  }, [isOn, fireflySeed]);

  const updateString = (x: number, y: number) => {
    if (pathRef.current) {
      pathRef.current.setAttribute('d', `M 0 0 L ${x} ${80 + y}`);
    }
  };

  const resetHandle = () => {
    if (handleRef.current) {
      handleRef.current.style.transform = 'translate(0px, 0px)';
    }
    updateString(0, 0);
  };

  const toggleLamp = (nextOn: boolean) => {
    setIsOn(nextOn);
    if (nextOn) {
      setFireflySeed((s) => s + 1);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      dragX: 0,
      dragY: 0,
      downAt: Date.now(),
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.dragging) return;
    let dragX = (e.clientX - dragState.current.startX) * 0.3;
    let dragY = Math.max(0, e.clientY - dragState.current.startY) * 0.6;
    dragX = Math.max(-35, Math.min(35, dragX));
    dragY = Math.min(180, dragY);

    dragState.current.dragX = dragX;
    dragState.current.dragY = dragY;

    if (handleRef.current) {
      handleRef.current.style.transform = `translate(${dragX}px, ${dragY}px)`;
    }
    updateString(dragX, dragY);
  };

  const handlePointerUp = () => {
    if (!dragState.current.dragging) return;
    const { dragX, dragY, downAt } = dragState.current;
    dragState.current.dragging = false;
    setIsDragging(false);

    const elapsed = Date.now() - downAt;
    const pulled = dragY > 24 || (elapsed < 280 && Math.abs(dragX) < 6 && dragY < 8);
    resetHandle();

    if (pulled) {
      toggleLamp(!isOn);
    }
  };

  const switchMode = (nextMode: 'login' | 'signup') => {
    setMode(nextMode);
    setAuthError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanUsername = loginUsername.trim();
    if (!cleanUsername || !loginPassword) {
      const msg = 'Please fill in all fields';
      setAuthError(msg);
      toast.error(msg);
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      const msg = 'Username can only contain letters, numbers, underscores, dots, or hyphens';
      setAuthError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    const { error } = await signInWithUsername(cleanUsername, loginPassword);
    setIsLoading(false);

    if (error) {
      const msg = error.message || 'Login failed';
      setAuthError(msg);
      toast.error(msg);
    } else {
      toast.success('Login successful!');
      navigate(from, { replace: true });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanUsername = signupUsername.trim();
    if (!cleanUsername || !signupPassword || !confirmPassword) {
      const msg = 'Please fill in all fields';
      setAuthError(msg);
      toast.error(msg);
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      const msg = 'Username can only contain letters, numbers, underscores, dots, or hyphens';
      setAuthError(msg);
      toast.error(msg);
      return;
    }

    if (signupPassword !== confirmPassword) {
      const msg = 'Passwords do not match';
      setAuthError(msg);
      toast.error(msg);
      return;
    }

    if (signupPassword.length < 6) {
      const msg = 'Password must be at least 6 characters';
      setAuthError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    const { error } = await signUpWithUsername(cleanUsername, signupPassword);
    setIsLoading(false);

    if (error) {
      const msg = error.message || 'Signup failed';
      setAuthError(msg);
      toast.error(msg);
    } else {
      toast.success('Account created successfully! You are now logged in.');
      navigate(from, { replace: true });
    }
  };

  return (
    <main className={`lamp-login-page room${isOn ? ' on' : ''}`} id="room">
      <div className="room-light" id="roomLight" />

      <div className="prompt" aria-hidden="true">
        <span>Pull the cord</span>
        <i />
      </div>

      <div className="fireflies" id="fireflies">
        {fireflies.map((dot) => (
          <span
            key={dot.id}
            className="firefly"
            style={
              {
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                '--duration': `${dot.duration}s`,
                '--delay': `${dot.delay}s`,
                '--x1': `${dot.x1}vw`,
                '--y1': `${dot.y1}vh`,
                '--x2': `${dot.x2}vw`,
                '--y2': `${dot.y2}vh`,
                '--x3': `${dot.x3}vw`,
                '--y3': `${dot.y3}vh`,
                '--x4': `${dot.x4}vw`,
                '--y4': `${dot.y4}vh`,
                '--x5': `${dot.x5}vw`,
                '--y5': `${dot.y5}vh`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <section className="lamp-side">
        <div className="lamp-container" id="lampContainer">
          <div className="lamp-glow" />
          <div className="lamp-head" />
          <div className="light-beam" />
          <div className="lamp-stem" />
          <div className="lamp-base" />
          <div className="desk-surface" />

          <svg className="string-svg" aria-hidden="true">
            <path ref={pathRef} id="stringPath" d="M 0 0 L 0 80" />
          </svg>

          <div
            ref={handleRef}
            className={`string-handle${isDragging ? ' dragging' : ''}`}
            id="stringHandle"
            role="button"
            tabIndex={0}
            aria-label={isOn ? 'Pull cord to turn lamp off' : 'Pull cord to turn lamp on'}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleLamp(!isOn);
              }
            }}
          />
        </div>
      </section>

      <section className="login-side">
        <form
          className="glass login-card"
          id="loginForm"
          onSubmit={mode === 'login' ? handleLogin : handleSignup}
        >
          <div className="glass-line" />

          <div className="login-heading">
            <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p>S.S.T POS • Sanyali School of Technology</p>
          </div>

          <div className="mode-switch" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`mode-btn${mode === 'login' ? ' active' : ''}`}
              onClick={() => switchMode('login')}
              disabled={isLoading}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`mode-btn${mode === 'signup' ? ' active' : ''}`}
              onClick={() => switchMode('signup')}
              disabled={isLoading}
            >
              Sign Up
            </button>
          </div>

          {authError && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/15 px-3.5 py-2.5 text-sm font-medium text-red-200">
              {authError}
            </div>
          )}

          {mode === 'login' ? (
            <div className="inputs">
              <label className="input-wrap">
                <span className="input-icon user-icon" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Username"
                  autoComplete="username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  disabled={isLoading}
                />
              </label>

              <label className="input-wrap">
                <span className="input-icon lock-icon" aria-hidden="true" />
                <input
                  type="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={isLoading}
                />
              </label>
            </div>
          ) : (
            <div className="inputs">
              <label className="input-wrap">
                <span className="input-icon user-icon" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Choose a username"
                  autoComplete="username"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  disabled={isLoading}
                />
              </label>

              <label className="input-wrap">
                <span className="input-icon lock-icon" aria-hidden="true" />
                <input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  autoComplete="new-password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  disabled={isLoading}
                />
              </label>

              <label className="input-wrap">
                <span className="input-icon lock-icon" aria-hidden="true" />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </label>
            </div>
          )}

          <button className="sign-in" type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <div className="divider">
            <span />
            <b>{mode === 'signup' ? 'NEW STAFF ACCOUNT' : 'AUTHORIZED ACCESS ONLY'}</b>
            <span />
          </div>
        </form>
      </section>
    </main>
  );
}
