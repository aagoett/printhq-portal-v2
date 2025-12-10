'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOutCustomer, createOrder, calculateQuote } from '@/lib/supabase';
import { Upload, CheckCircle, Clock, MapPin, Package, FileText, DollarSign, Zap, LogOut, History } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [config, setConfig] = useState({
    product: '',
    quantity: '',
    paper: '',
    finishing: [],
    turnaround: 'standard',
    location: 'auto'
  });
  const [quote, setQuote] = useState(null);
  const [proofApproved, setProofApproved] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.push('/auth');
      return;
    }
    setUser(currentUser);
    setLoading(false);
  }

  async function handleSignOut() {
    await signOutCustomer();
    router.push('/auth');
  }

  const products = [
    { id: 'business-cards', name: 'Business Cards', icon: '💳' },
    { id: 'flyers', name: 'Flyers & Postcards', icon: '📄' },
    { id: 'brochures', name: 'Brochures', icon: '📑' },
    { id: 'posters', name: 'Posters', icon: '🖼️' },
    { id: 'banners', name: 'Banners', icon: '🎌' }
  ];

  const paperTypes = [
    '100# Gloss Text',
    '100# Gloss Cover',
    '80# Matte Text',
    '100# Matte Cover',
    '14pt C2S',
    '16pt C2S'
  ];

  const finishingOptions = [
    'Folding',
    'Drilling',
    'Cutting to size',
    'Lamination',
    'EDDM Prep',
    'Mailing Services'
  ];

  const locations = [
    { id: 'auto', name: 'Best Location (Auto)', desc: 'We pick the fastest/cheapest' },
    { id: 'san-jose', name: 'San Jose, CA', desc: 'West Coast facility' },
    { id: 'dallas', name: 'Dallas, TX', desc: 'Central facility' }
  ];

  const calculateQuoteHandler = async () => {
    const result = await calculateQuote(
      config.product,
      parseInt(config.quantity),
      config.paper,
      config.finishing,
      config.turnaround
    );

    if (result.success) {
      setQuote({
        standard: result.quote.standard,
        rush: result.quote.rush,
        turnaround: config.turnaround === 'rush' ? '24 hours' : '3-5 days',
        location: config.location === 'auto' ? 'San Jose' : locations.find(l => l.id === config.location)?.name,
        details: {
          sheets: result.quote.breakdown?.sheets || Math.ceil(parseInt(config.quantity) / 8),
          pressTime: result.quote.breakdown?.pressTime || '2.5 hours',
          finishingTime: '1 hour'
        }
      });
      setStep('quote');
    }
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setTimeout(() => setStep('configure'), 800);
    }
  };

  const approveProof = async () => {
    setProofApproved(true);
    
    const finalPrice = config.turnaround === 'rush' ? parseFloat(quote.rush) : parseFloat(quote.standard);
    
    const result = await createOrder(user.id, {
      product: config.product,
      quantity: parseInt(config.quantity),
      paper: config.paper,
      finishing: config.finishing,
      turnaround: config.turnaround,
      location: config.location,
      standardPrice: parseFloat(quote.standard),
      rushPrice: parseFloat(quote.rush),
      finalPrice: finalPrice
    });

    if (result.success) {
      setTimeout(() => {
        alert('✅ Job submitted to production!\nJob ID: ' + result.order.id.substring(0, 8).toUpperCase() + '\n\nYou will receive updates via email.');
      }, 500);
    } else {
      alert('Error submitting order: ' + result.error);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: '"Space Mono", monospace'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      fontFamily: '"Space Mono", "Courier New", monospace',
      color: '#f1f5f9',
      position: 'relative',
      overflow: 'hidden'
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
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(59, 130, 246, 0.3);
        }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <header style={{
          padding: '2rem 3rem',
          borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 'bold',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
              }}>
                <Zap size={28} color="#fff" />
              </div>
              <div>
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
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
                  {user?.email}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}
              >
                <History size={16} />
                Order History
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <div style={{
          maxWidth: '1200px',
          margin: '3rem auto',
          padding: '0 1.5rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            position: 'relative',
            marginBottom: '3rem'
          }}>
            {[
              { id: 'upload', label: 'Upload', icon: Upload },
              { id: 'configure', label: 'Configure', icon: Package },
              { id: 'quote', label: 'Quote', icon: DollarSign },
              { id: 'proof', label: 'Approve', icon: CheckCircle }
            ].map((s, idx) => {
              const stepIndex = ['upload', 'configure', 'quote', 'proof'].indexOf(step);
              const currentIndex = ['upload', 'configure', 'quote', 'proof'].indexOf(s.id);
              const isActive = currentIndex === stepIndex;
              const isComplete = currentIndex < stepIndex;
              
              return (
                <div key={s.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  position: 'relative'
                }}>
                  {idx > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      right: '50%',
                      width: '100%',
                      height: '2px',
                      background: isComplete ? '#3b82f6' : '#334155',
                      transition: 'background 0.3s'
                    }} />
                  )}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: isComplete ? '#3b82f6' : isActive ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#1e293b',
                    border: isActive ? '3px solid #3b82f6' : '2px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    zIndex: 2,
                    transition: 'all 0.3s',
                    boxShadow: isActive ? '0 0 20px rgba(59, 130, 246, 0.6)' : 'none'
                  }}>
                    <s.icon size={20} color={isComplete || isActive ? '#fff' : '#64748b'} />
                  </div>
                  <div style={{
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 'bold' : 'normal',
                    color: isActive ? '#3b82f6' : '#64748b'
                  }}>
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 1.5rem 3rem'
        }}>
          {step === 'upload' && (
            <div className="fade-in-up" style={{
              background: 'rgba(30, 41, 59, 0.6)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '3rem',
              textAlign: 'center'
            }}>
              <Upload size={64} color="#3b82f6" style={{ margin: '0 auto 1.5rem', display: 'block' }} />
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Upload Your Artwork</h2>
              <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
                Drag and drop your file or click to browse<br />
                Accepted: PDF, AI, EPS, PNG, JPG (Max 100MB)
              </p>
              <label style={{
                display: 'inline-block',
                padding: '1rem 3rem',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: 'white',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)'
              }}
              className="hover-lift">
                Choose File
                <input
                  type="file"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  accept=".pdf,.ai,.eps,.png,.jpg,.jpeg"
                />
              </label>
              {file && (
                <div style={{
                  marginTop: '2rem',
                  padding: '1rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  <FileText size={24} color="#3b82f6" style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  <span>{file.name}</span>
                  <div style={{ marginTop: '0.5rem', color: '#3b82f6', animation: 'pulse 1.5s infinite' }}>
                    Analyzing file...
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'configure' && (
            <div className="fade-in-up" style={{
              background: 'rgba(30, 41, 59, 0.6)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '2rem'
            }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Configure Your Job</h2>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem', fontSize: '1.1rem', color: '#3b82f6' }}>
                  Product Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  {products.map(product => (
                    <div
                      key={product.id}
                      onClick={() => setConfig({ ...config, product: product.id })}
                      className="hover-lift"
                      style={{
                        padding: '1.5rem 1rem',
                        background: config.product === product.id ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(51, 65, 85, 0.5)',
                        border: config.product === product.id ? '2px solid #3b82f6' : '1px solid #334155',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.3s'
                      }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{product.icon}</div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{product.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem', color: '#3b82f6' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={config.quantity}
                    onChange={(e) => setConfig({ ...config, quantity: e.target.value })}
                    placeholder="e.g., 1000"
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'rgba(51, 65, 85, 0.5)',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem', color: '#3b82f6' }}>
                    Paper Stock
                  </label>
                  <select
                    value={config.paper}
                    onChange={(e) => setConfig({ ...config, paper: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'rgba(51, 65, 85, 0.5)',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Select paper...</option>
                    {paperTypes.map(paper => (
                      <option key={paper} value={paper}>{paper}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem', fontSize: '1.1rem', color: '#3b82f6' }}>
                  Finishing Options
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                  {finishingOptions.map(option => (
                    <div
                      key={option}
                      onClick={() => {
                        const newFinishing = config.finishing.includes(option)
                          ? config.finishing.filter(f => f !== option)
                          : [...config.finishing, option];
                        setConfig({ ...config, finishing: newFinishing });
                      }}
                      style={{
                        padding: '0.75rem',
                        background: config.finishing.includes(option) ? 'rgba(59, 130, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)',
                        border: config.finishing.includes(option) ? '2px solid #3b82f6' : '1px solid #334155',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.3s',
                        fontSize: '0.85rem'
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '1rem', fontSize: '1.1rem', color: '#3b82f6' }}>
                    Turnaround Time
                  </label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {[
                      { id: 'standard', label: 'Standard', icon: Clock },
                      { id: 'rush', label: 'Rush', icon: Zap }
                    ].map(option => (
                      <div
                        key={option.id}
                        onClick={() => setConfig({ ...config, turnaround: option.id })}
                        className="hover-lift"
                        style={{
                          flex: 1,
                          padding: '1.5rem',
                          background: config.turnaround === option.id ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(51, 65, 85, 0.5)',
                          border: config.turnaround === option.id ? '2px solid #3b82f6' : '1px solid #334155',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.3s'
                        }}
                      >
                        <option.icon size={24} style={{ marginBottom: '0.5rem', display: 'inline-block' }} />
                        <div style={{ fontWeight: 'bold' }}>{option.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '1rem', fontSize: '1.1rem', color: '#3b82f6' }}>
                    Production Location
                  </label>
                  <select
                    value={config.location}
                    onChange={(e) => setConfig({ ...config, location: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'rgba(51, 65, 85, 0.5)',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '1rem'
                    }}
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name} - {loc.desc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={calculateQuoteHandler}
                disabled={!config.product || !config.quantity || !config.paper}
                className="hover-lift"
                style={{
                  width: '100%',
                  padding: '1.5rem',
                  background: (!config.product || !config.quantity || !config.paper)
                    ? '#334155'
                    : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  cursor: (!config.product || !config.quantity || !config.paper) ? 'not-allowed' : 'pointer',
                  opacity: (!config.product || !config.quantity || !config.paper) ? 0.5 : 1,
                  boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)'
                }}
              >
                Generate Quote →
              </button>
            </div>
          )}

          {step === 'quote' && quote && (
            <div className="fade-in-up" style={{
              background: 'rgba(30, 41, 59, 0.6)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '3rem'
            }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>Your Instant Quote</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                <div style={{
                  padding: '2rem',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
                  borderRadius: '12px',
                  border: config.turnaround === 'standard' ? '3px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.3)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' }}>STANDARD</div>
                  <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '0.5rem' }}>
                    ${quote.standard}
                  </div>
                  <div style={{ color: '#94a3b8' }}>3-5 business days</div>
                </div>

                <div style={{
                  padding: '2rem',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
                  borderRadius: '12px',
                  border: config.turnaround === 'rush' ? '3px solid #8b5cf6' : '1px solid rgba(139, 92, 246, 0.3)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' }}>RUSH</div>
                  <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '0.5rem' }}>
                    ${quote.rush}
                  </div>
                  <div style={{ color: '#94a3b8' }}>24 hours</div>
                </div>
              </div>

              <div style={{
                background: 'rgba(51, 65, 85, 0.5)',
                borderRadius: '8px',
                padding: '2rem',
                marginBottom: '2rem'
              }}>
                <h3 style={{ marginBottom: '1.5rem', color: '#3b82f6' }}>Job Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Production Location</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                      <MapPin size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                      {quote.location}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Turnaround</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                      <Clock size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                      {quote.turnaround}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Sheets Required</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{quote.details.sheets} sheets</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Press Time</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{quote.details.pressTime}</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Finishing Time</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{quote.details.finishingTime}</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Product</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                      {products.find(p => p.id === config.product)?.name}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('proof')}
                className="hover-lift"
                style={{
                  width: '100%',
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)'
                }}
              >
                Continue to Proof Review →
              </button>
            </div>
          )}

          {step === 'proof' && (
            <div className="fade-in-up" style={{
              background: 'rgba(30, 41, 59, 0.6)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '3rem'
            }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>Review Your Proof</h2>

              <div style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '3rem',
                marginBottom: '2rem',
                textAlign: 'center',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed #3b82f6'
              }}>
                <div style={{ color: '#334155' }}>
                  <FileText size={64} color="#3b82f6" style={{ marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {file?.name}
                  </div>
                  <div style={{ color: '#64748b' }}>
                    Your print-ready proof would appear here
                  </div>
                  <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                    ✓ Bleed verified<br />
                    ✓ Color space: GRACoL<br />
                    ✓ Resolution: 300 DPI
                  </div>
                </div>
              </div>

              {!proofApproved ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <button
                    onClick={() => setStep('configure')}
                    style={{
                      padding: '1.5rem',
                      background: 'rgba(51, 65, 85, 0.5)',
                      color: '#f1f5f9',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    ← Request Changes
                  </button>
                  <button
                    onClick={approveProof}
                    className="hover-lift"
                    style={{
                      padding: '1.5rem',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    <CheckCircle size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Approve & Send to Production
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: '2rem',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))',
                  borderRadius: '8px',
                  border: '2px solid #10b981',
                  textAlign: 'center'
                }}>
                  <CheckCircle size={48} color="#10b981" style={{ marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                  <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Proof Approved!</h3>
                  <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>Your job has been sent to production. You'll receive email updates.</p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    style={{
                      padding: '1rem 2rem',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    View Order History →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <footer style={{
          marginTop: '4rem',
          padding: '2rem 1.5rem',
          borderTop: '1px solid rgba(59, 130, 246, 0.3)',
          background: 'rgba(15, 23, 42, 0.8)',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
              <strong style={{ color: '#3b82f6' }}>PRINTHQ</strong> - Automated Print Production System
            </div>
            <div style={{ fontSize: '0.75rem' }}>
              San Jose, CA • Dallas, TX • 24/7 Production • Instant Quotes • AI-Powered Workflow
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
