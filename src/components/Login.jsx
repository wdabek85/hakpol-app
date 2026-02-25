import { useState } from 'react';
import { supabase } from '../supabase.js';

const AUTH_EMAIL = import.meta.env.VITE_AUTH_EMAIL;

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: AUTH_EMAIL,
        password,
      });
      if (authError) {
        setError('Nieprawidłowe hasło');
      }
    } catch {
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'white',
        borderRadius: 12,
        padding: '40px 36px',
        width: 360,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 36, margin: 0 }}>🔧</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a365d', margin: '8px 0 4px' }}>
            HakPol
          </h1>
          <p style={{ fontSize: 13, color: '#718096', margin: 0 }}>
            Mapa Ofert Allegro
          </p>
        </div>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>
          Hasło zespołu
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Wpisz hasło..."
          autoFocus
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            border: '2px solid #e2e8f0',
            borderRadius: 8,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#2c5282'}
          onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
        />

        {error && (
          <p style={{ color: '#e53e3e', fontSize: 13, margin: '8px 0 0', fontWeight: 500 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '10px 0',
            background: loading || !password ? '#a0aec0' : '#2c5282',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading || !password ? 'default' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Logowanie...' : 'Zaloguj'}
        </button>
      </form>
    </div>
  );
}
