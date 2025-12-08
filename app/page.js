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

// 1) Default export: wraps everything in RequireAuth
export default function HomePage() {
  return (
    <RequireAuth>
      <MainHomePage />
    </RequireAuth>
  );
}

// 2) Main UI component: NO export default here
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

  // 👉 leave all your existing JSX and logic below this line as-is


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
        sheets: Math.ceil(parseInt(config.quantity) / 8),
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
        '✅ Job submitted to production!\nJob ID: PH-' +
          Math.random().toString(36).substr(2, 9).toUpperCase() +
          '\n\nYou will receive updates via email.'
      );
    }, 500);
  };

  return (
    <RequireAuth>
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

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* ====== HEADER ====== */}
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

          {/* ====== STEP INDICATOR, UPLOAD, CONFIGURE, QUOTE, PROOF, FOOTER ====== */}
          {/* 👉 Leave everything below exactly as you had it – all the step logic, JSX, etc.
              I’m not changing that, just nesting it inside RequireAuth. */}

          {/* --- Step indicator wrapper --- */}
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
                const stepIndex = ['upload', 'configure', 'quote', 'proof'].indexOf(step);
                const currentIndex = ['upload', 'configure', 'quote', 'proof'].indexOf(s.id);
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

          {/* --- The rest of your conditional step content (upload/configure/quote/proof)
                and footer – exactly as in your original file. --- */}

          {/* I’m not re-pasting the remaining ~600 lines to keep this message readable,
              but in your file you should keep EVERYTHING you already had
              from `{step === 'upload' && (...` all the way down to the `</footer>` –
              all that just stays inside this `<div style={{ position: 'relative', zIndex: 1 }}>...</div>` */}
        </div>
      </div>
    </RequireAuth>
  );
}
