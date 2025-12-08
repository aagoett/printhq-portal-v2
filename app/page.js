'use client';

import React, { useState } from 'react';
import RequireAuth from './components/RequireAuth';
import {
  Upload,
  CheckCircle,
  Clock,
  MapPin,
  Package,
  FileText,
  DollarSign,
  Zap,
} from 'lucide-react';

// Outer page – just wraps the real UI in RequireAuth
export default function HomePage() {
  return (
    <RequireAuth>
      <MainHomePage />
    </RequireAuth>
  );
}

// All your PrintHQ UI + logic lives here
function MainHomePage() {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [config, setConfig] = useState({
    product: '',
    quantity: '',
    paper: '',
    finishing: [],
    turnaround: 'standard',
    location: 'auto',
  });
  const [quote, setQuote] = useState(null);
  const [proofApproved, setProofApproved] = useState(false);

  const products = [
    { id: 'business-cards', name: 'Business Cards', icon: '💳' },
    { id: 'flyers', name: 'Flyers & Postcards', icon: '📄' },
    { id: 'brochures', name: 'Brochures', icon: '📑' },
    { id: 'posters', name: 'Posters', icon: '🖼️' },
    { id: 'banners', name: 'Banners', icon: '🎌' },
  ];

  const paperTypes = [
    '100# Gloss Text',
    '100# Gloss Cover',
    '80# Matte Text',
    '100# Matte Cover',
    '14pt C2S',
    '16pt C2S',
  ];

  const finishingOptions = [
    'Folding',
    'Drilling',
    'Cutting to size',
    'Lamination',
    'EDDM Prep',
    'Mailing Services',
  ];

  const locations = [
    { id: 'auto', name: 'Best Location (Auto)', desc: 'We pick the fastest/cheapest' },
    { id: 'san-jose', name: 'San Jose, CA', desc: 'West Coast facility' },
    { id: 'dallas', name: 'Dallas, TX', desc: 'Central facility' },
  ];

  const calculateQuote = () => {
    const basePrice = Math.random() * 500 + 200;
    const rushMultiplier = config.turnaround === 'rush' ? 1.5 : 1;
    const standardPrice = basePrice * rushMultiplier;

    setQuote({
      standard: standardPrice.toFixed(2),
      rush: (standardPrice * 1.5).toFixed(2),
      turnaround: config.turnaround === 'rush' ? '24 hours' : '3-5 days',
      location:
        config.location === 'auto'
          ? 'San Jose'
          : locations.find((l) => l.id === config.location)?.name,
      details: {
        sheets: Math.ceil(parseInt(config.quantity, 10) / 8),
        pressTime: '2.5 hours',
        finishingTime: '1 hour',
      },
    });
    setStep('quote');
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setTimeout(() => setStep('configure'), 800);
    }
  };

  const approveProof = () => {
    setProofApproved(true);
    setTimeout(() => {
      alert(
        '✅ Job submitted to production!\n' +
          'Job ID: PH-' +
          Math.random().toString(36).substr(2, 9).toUpperCase() +
          '\n\nYou will receive updates via email.',
      );
    }, 500);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        fontFamily: '"Space Mono", "Courier New", monospace',
        color: '#f1f5f9',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
          linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
        `,
          backgroundSize: '50px 50px',
          animation: 'gridSlide 20s linear infinite',
          zIndex: 0,
        }}
      />

      <style jsx>{`
        @keyframes gridSlide {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
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
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
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

      {/* HEADER */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <header
          style={{
            padding: '2rem 3rem',
            borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
                }}
              >
                <Zap size={28} color="#fff" />
              </div>
              <div>
                <h1
                  style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    margin: 0,
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '2px',
                  }}
                >
                  PRINTHQ
                </h1>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
                  Automated Print Production System
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#3b82f6', fontWeight: 'bold' }}>2</div>
                <div style={{ color: '#64748b' }}>Locations</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#3b82f6', fontWeight: 'bold' }}>24/7</div>
                <div style={{ color: '#64748b' }}>Production</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#3b82f6', fontWeight: 'bold' }}>Instant</div>
                <div style={{ color: '#64748b' }}>Quotes</div>
              </div>
            </div>
          </div>
        </header>

        {/* STEPPER */}
        <div
          style={{
            maxWidth: '1200px',
            margin: '3rem auto',
            padding: '0 1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              position: 'relative',
              marginBottom: '3rem',
            }}
          >
            {[
              { id: 'upload', label: 'Upload', icon: Upload },
              { id: 'configure', label: 'Configure', icon: Package },
              { id: 'quote', label: 'Quote', icon: DollarSign },
              { id: 'proof', label: 'Approve', icon: CheckCircle },
            ].map((s, idx) => {
              const order = ['upload', 'configure', 'quote', 'proof'];
              const stepIndex = order.indexOf(step);
              const currentIndex = order.indexOf(s.id);
              const isActive = currentIndex === stepIndex;
              const isComplete = currentIndex < stepIndex;

              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    position: 'relative',
                  }}
                >
                  {idx > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '20px',
                        right: '50%',
                        width: '100%',
                        height: '2px',
                        background: isComplete ? '#3b82f6' : '#334155',
                        transition: 'background 0.3s',
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: isComplete
                        ? '#3b82f6'
                        : isActive
                        ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                        : '#1e293b',
                      border: isActive ? '3px solid #3b82f6' : '2px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      zIndex: 2,
                      transition: 'all 0.3s',
                      boxShadow: isActive ? '0 0 20px rgba(59, 130, 246, 0.6)' : 'none',
                    }}
                  >
                    <s.icon size={20} color={isComplete || isActive ? '#fff' : '#64748b'} />
                  </div>
                  <div
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: isActive ? 'bold' : 'normal',
                      color: isActive ? '#3b82f6' : '#64748b',
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MAIN AREA (UPLOAD / CONFIG / QUOTE / PROOF) */}
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 1.5rem 3rem',
          }}
        >
          {/* UPLOAD */}
          {step === 'upload' && (
            <div
              className="fade-in-up"
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '3rem',
                textAlign: 'center',
              }}
            >
              <Upload
                size={64}
                color="#3b82f6"
                style={{ margin: '0 auto 1.5rem', display: 'block' }}
              />
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Upload Your Artwork</h2>
              <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
                Drag and drop your file or click to browse
                <br />
                Accepted: PDF, AI, EPS, PNG, JPG (Max 100MB)
              </p>
              <label
                style={{
                  display: 'inline-block',
                  padding: '1rem 3rem',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)',
                }}
                className="hover-lift"
              >
                Choose File
                <input
                  type="file"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  accept=".pdf,.ai,.eps,.png,.jpg,.jpeg"
                />
              </label>
              {file && (
                <div
                  style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <FileText
                    size={24}
                    color="#3b82f6"
                    style={{
                      display: 'inline-block',
                      marginRight: '0.5rem',
                      verticalAlign: 'middle',
                    }}
                  />
                  <span>{file.name}</span>
                  <div
                    style={{
                      marginTop: '0.5rem',
                      color: '#3b82f6',
                      animation: 'pulse 1.5s infinite',
                    }}
                  >
                    Analyzing file...
                  </div>
                </div>
              )}
            </div>
          )}

          {/* (CONFIG, QUOTE, PROOF SECTIONS ARE THE SAME AS YOU ALREADY HAVE) */}
          {/* I’m leaving your existing CONFIG / QUOTE / PROOF JSX here unchanged */}
          {/* Just keep them exactly as in your current file, inside MainHomePage */}
        </div>

        <footer
          style={{
            marginTop: '4rem',
            padding: '2rem 1.5rem',
            borderTop: '1px solid rgba(59, 130, 246, 0.3)',
            background: 'rgba(15, 23, 42, 0.8)',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
              <strong style={{ color: '#3b82f6' }}>PRINTHQ</strong> - Automated Print Production
              System
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
