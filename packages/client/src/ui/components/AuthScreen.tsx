import React, { useState } from 'react';
import {
  signInAsGuest,
  signInWithGoogle,
  signInWithEmail,
  registerWithEmail,
} from '../../auth/auth-service.js';
import type { User } from 'firebase/auth';

// ---------------------------------------------------------------------------
// AuthScreen — full-screen overlay for login/registration
// ---------------------------------------------------------------------------

const PLAYER_ID_KEY = 'nebulife_player_id';

interface AuthScreenProps {
  onAuthenticated: (user: User, isNewUser: boolean) => void;
}

type Screen = 'landing' | 'email-login' | 'email-register';

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [screen, setScreen] = useState<Screen>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hasLegacyPlayer = !!localStorage.getItem(PLAYER_ID_KEY);

  const handleAuth = async (authFn: () => Promise<User>, isNew: boolean) => {
    setError('');
    setLoading(true);
    try {
      const user = await authFn();
      onAuthenticated(user, isNew);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Помилка авторизації';
      // Firebase error messages are in English — translate common ones
      if (msg.includes('email-already-in-use')) setError('Ця пошта вже зареєстрована');
      else if (msg.includes('wrong-password') || msg.includes('invalid-credential')) setError('Невірний пароль');
      else if (msg.includes('user-not-found')) setError('Користувача не знайдено');
      else if (msg.includes('weak-password')) setError('Пароль занадто короткий (мін. 6 символів)');
      else if (msg.includes('invalid-email')) setError('Невірний формат пошти');
      else if (msg.includes('popup-closed')) setError('Вікно авторизації було закрите');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => handleAuth(() => signInAsGuest(), true);
  const handleGoogle = () => handleAuth(() => signInWithGoogle(), true);

  const handleEmailLogin = () => {
    if (!email || !password) { setError('Заповніть всі поля'); return; }
    handleAuth(() => signInWithEmail(email, password), false);
  };

  const handleEmailRegister = () => {
    if (!email || !password || !confirmPassword) { setError('Заповніть всі поля'); return; }
    if (password !== confirmPassword) { setError('Паролі не співпадають'); return; }
    if (password.length < 6) { setError('Пароль занадто короткий (мін. 6 символів)'); return; }
    handleAuth(() => registerWithEmail(email, password), true);
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        {/* Title */}
        <div style={titleStyle}>N E B U L I F E</div>
        <div style={subtitleStyle}>дослідження всесвіту</div>

        {/* Legacy player banner */}
        {hasLegacyPlayer && screen === 'landing' && (
          <div style={bannerStyle}>
            У вас є збережений прогрес. Увійдіть щоб зберегти його.
          </div>
        )}

        {/* Error message */}
        {error && <div style={errorStyle}>{error}</div>}

        {/* Landing screen */}
        {screen === 'landing' && (
          <>
            <button
              style={googleBtnStyle}
              onClick={handleGoogle}
              disabled={loading}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              {loading ? 'Завантаження...' : 'Увiйти з Google'}
            </button>

            <button
              style={btnStyle}
              onClick={() => { setScreen('email-login'); setError(''); }}
              disabled={loading}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              Email / Пароль
            </button>

            <div style={dividerStyle}>
              <span style={dividerLineStyle} />
              <span style={dividerTextStyle}>або</span>
              <span style={dividerLineStyle} />
            </div>

            <button
              style={guestBtnStyle}
              onClick={handleGuest}
              disabled={loading}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              Грати як гість
            </button>
            <div style={guestNoteStyle}>
              Гостьовий режим: прогрес зберігається, покупка кварків недоступна
            </div>
          </>
        )}

        {/* Email login screen */}
        {screen === 'email-login' && (
          <>
            <input
              style={inputStyle}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <input
              style={inputStyle}
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
            />
            <button
              style={btnStyle}
              onClick={handleEmailLogin}
              disabled={loading}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              {loading ? 'Завантаження...' : 'Увійти'}
            </button>
            <button
              style={linkBtnStyle}
              onClick={() => { setScreen('email-register'); setError(''); }}
            >
              Немає акаунту? Зареєструватись
            </button>
            <button
              style={linkBtnStyle}
              onClick={() => { setScreen('landing'); setError(''); }}
            >
              Назад
            </button>
          </>
        )}

        {/* Email register screen */}
        {screen === 'email-register' && (
          <>
            <input
              style={inputStyle}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <input
              style={inputStyle}
              type="password"
              placeholder="Пароль (мін. 6 символів)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              style={inputStyle}
              type="password"
              placeholder="Підтвердіть пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailRegister()}
            />
            <button
              style={btnStyle}
              onClick={handleEmailRegister}
              disabled={loading}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              {loading ? 'Завантаження...' : 'Зареєструватись'}
            </button>
            <button
              style={linkBtnStyle}
              onClick={() => { setScreen('email-login'); setError(''); }}
            >
              Вже є акаунт? Увійти
            </button>
            <button
              style={linkBtnStyle}
              onClick={() => { setScreen('landing'); setError(''); }}
            >
              Назад
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(2, 5, 16, 0.88)',
  fontFamily: 'monospace',
};

const cardStyle: React.CSSProperties = {
  width: 340,
  padding: '32px 28px',
  background: 'rgba(10, 15, 25, 0.96)',
  border: '1px solid #334455',
  borderRadius: 6,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  color: '#ccddee',
  textAlign: 'center',
  letterSpacing: '0.2em',
  marginBottom: 2,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#556677',
  textAlign: 'center',
  letterSpacing: '0.1em',
  marginBottom: 12,
};

const bannerStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#ff8844',
  textAlign: 'center',
  padding: '8px 12px',
  background: 'rgba(255, 136, 68, 0.08)',
  border: '1px solid rgba(255, 136, 68, 0.2)',
  borderRadius: 4,
  marginBottom: 4,
};

const errorStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#cc4444',
  textAlign: 'center',
  padding: '6px 12px',
  background: 'rgba(204, 68, 68, 0.08)',
  border: '1px solid rgba(204, 68, 68, 0.2)',
  borderRadius: 4,
};

const btnStyle: React.CSSProperties = {
  padding: '10px 0',
  minHeight: 44,
  background: 'rgba(40, 80, 110, 0.7)',
  border: '1px solid #5599bb',
  color: '#bbddff',
  fontSize: 12,
  fontFamily: 'monospace',
  borderRadius: 3,
  cursor: 'pointer',
  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
};

const googleBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'rgba(50, 90, 120, 0.8)',
  borderColor: '#66aacc',
  color: '#cceeff',
};

const guestBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'rgba(30, 60, 80, 0.5)',
  borderColor: '#4488aa',
  color: '#88bbdd',
  fontSize: 11,
};

const guestNoteStyle: React.CSSProperties = {
  fontSize: 9,
  color: '#445566',
  textAlign: 'center',
  lineHeight: 1.4,
};

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#4488aa',
  fontSize: 10,
  fontFamily: 'monospace',
  cursor: 'pointer',
  padding: '4px 0',
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
};

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  minHeight: 44,
  background: 'rgba(10, 20, 35, 0.8)',
  border: '1px solid #334455',
  color: '#aabbcc',
  fontSize: 12,
  fontFamily: 'monospace',
  borderRadius: 3,
  outline: 'none',
};

const dividerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  margin: '4px 0',
};

const dividerLineStyle: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: '#223344',
};

const dividerTextStyle: React.CSSProperties = {
  fontSize: 9,
  color: '#445566',
};

function hoverIn(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget;
  btn.style.background = 'rgba(25, 40, 55, 0.6)';
  btn.style.borderColor = '#445566';
  btn.style.color = '#8899aa';
}

function hoverOut(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget;
  btn.style.background = '';
  btn.style.borderColor = '';
  btn.style.color = '';
}
