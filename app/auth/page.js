'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomer, signInCustomer } from '../../lib/supabase';
import { Lock, Mail, Building, User, Zap } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: '',
    contactName: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const result = await createCustomer(
          formData.email,
          formData.password,
          formData.companyName,
          formData.contactName
        );

        if (result.success) {
          setSuccess('Account created! Please check your email to verify.');
          setTimeout(() => {
            setMode('login');
            setSuccess('');
          }, 3000);
        } else {
          setError(result.error || 'Failed to create account');
        }
      } else {
        const result = await signInCustomer(formData.email, formData.password);

        if (result.success) {
          setSuccess('Logged in successfully!');
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
        } else {
          setError(result.error || 'Failed to log in');
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: '"Space Mono", "Courier New", monospace'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        animation: 'gridSlide 20s linear infinite',
        zIndex: 0
      }} />

      <style jsx>{`
        @keyframes gridSlide {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
      `}</style>

      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '450px',
        background: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        padding: '3rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '2rem',
          gap: '1rem'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
          }}>
            <Zap size={28} color="#fff" />
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            margin: 0,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '2px'
          }}>
            PRINTHQ
          </h1>
        </div>

        <p style={{
          textAlign: 'center',
          color: '#94a3b8',
          marginBottom: '2rem',
          fontSize: '0.95rem'
        }}>
          {mode === 'login' ? 'Welcome back!' : 'Create your account'}
        </p>

        {/* Toggle Mode */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          background: 'rgba(51, 65, 85, 0.5)',
          padding: '0.25rem',
          borderRadius: '8px'
        }}>
          <button
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: mode === 'login' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.3s'
            }}
          >
            Login
          </button>
          <button
            onClick={() => setMode('signup')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: mode === 'signup' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.3s'
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={{
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '1rem',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            color: '#86efac',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#94a3b8',
                  fontSize: '0.875rem'
                }}>
                  <Building size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(51, 65, 85, 0.5)',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '1rem'
                  }}
                  placeholder="Your Company Name"
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#94a3b8',
                  fontSize: '0.875rem'
                }}>
                  <User size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Contact Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(51, 65, 85, 0.5)',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '1rem'
                  }}
                  placeholder="Your Name"
                />
              </div>
            </>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#94a3b8',
              fontSize: '0.875rem'
            }}>
              <Mail size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'rgba(51, 65, 85, 0.5)',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '1rem'
              }}
              placeholder="you@company.com"
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#94a3b8',
              fontSize: '0.875rem'
            }}>
              <Lock size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'rgba(51, 65, 85, 0.5)',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '1rem'
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading ? '#334155' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.3s'
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.875rem'
        }}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.875rem'
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.875rem'
                }}
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}        if (result.success) {
          setSuccess('Account created! Please check your email to verify.');
          setTimeout(() => {
            setMode('login');
            setSuccess('');
          }, 3000);
        } else {
          setError(result.error || 'Failed to create account');
        }
      } else {
        const result = await signInCustomer(formData.email, formData.password);

        if (result.success) {
          setSuccess('Logged in successfully!');
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
        } else {
          setError(result.error || 'Failed to log in');
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: '"Space Mono", "Courier New", monospace'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        animation: 'gridSlide 20s linear infinite',
        zIndex: 0
      }} />

      <style jsx>{`
        @keyframes gridSlide {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
      `}</style>

      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '450px',
        background: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        padding: '3rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '2rem',
          gap: '1rem'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
          }}>
            <Zap size={28} color="#fff" />
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            margin: 0,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '2px'
          }}>
            PRINTHQ
          </h1>
        </div>

        <p style={{
          textAlign: 'center',
          color: '#94a3b8',
          marginBottom: '2rem',
          fontSize: '0.95rem'
        }}>
          {mode === 'login' ? 'Welcome back!' : 'Create your account'}
        </p>

        {/* Toggle Mode */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          background: 'rgba(51, 65, 85, 0.5)',
          padding: '0.25rem',
          borderRadius: '8px'
        }}>
          <button
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: mode === 'login' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.3s'
            }}
          >
            Login
          </button>
          <button
            onClick={() => setMode('signup')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: mode === 'signup' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.3s'
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={{
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '1rem',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            color: '#86efac',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#94a3b8',
                  fontSize: '0.875rem'
                }}>
                  <Building size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(51, 65, 85, 0.5)',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '1rem'
                  }}
                  placeholder="Your Company Name"
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#94a3b8',
                  fontSize: '0.875rem'
                }}>
                  <User size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Contact Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(51, 65, 85, 0.5)',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '1rem'
                  }}
                  placeholder="Your Name"
                />
              </div>
            </>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#94a3b8',
              fontSize: '0.875rem'
            }}>
              <Mail size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'rgba(51, 65, 85, 0.5)',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '1rem'
              }}
              placeholder="you@company.com"
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#94a3b8',
              fontSize: '0.875rem'
            }}>
              <Lock size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'rgba(51, 65, 85, 0.5)',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '1rem'
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading ? '#334155' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.3s'
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.875rem'
        }}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.875rem'
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.875rem'
                }}
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
