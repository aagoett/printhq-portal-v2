'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getCustomerOrders, getCustomerProfile, signOutCustomer } from '@/lib/supabase';
import { Package, Clock, CheckCircle, Zap, LogOut, RefreshCw, ArrowLeft } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.push('/auth');
      return;
    }

    setUser(currentUser);

    const profileResult = await getCustomerProfile(currentUser.id);
    if (profileResult.success) {
      setCustomer(profileResult.customer);
    }

    const ordersResult = await getCustomerOrders(currentUser.id);
    if (ordersResult.success) {
      setOrders(ordersResult.orders);
    }

    setLoading(false);
  }

  async function handleSignOut() {
    await signOutCustomer();
    router.push('/auth');
  }

  function getStatusColor(status) {
    const colors = {
      'quote': '#94a3b8',
      'approved': '#3b82f6',
      'in_production': '#f59e0b',
      'complete': '#10b981',
      'shipped': '#10b981',
      'cancelled': '#ef4444'
    };
    return colors[status] || '#94a3b8';
  }

  function getStatusLabel(status) {
    const labels = {
      'quote': 'Quote',
      'approved': 'Approved',
      'in_production': 'In Production',
      'complete': 'Complete',
      'shipped': 'Shipped',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  }

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
      color: '#f1f5f9'
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
                  {customer?.company_name || user?.email}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={() => router.push('/')}
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
                <ArrowLeft size={16} />
                New Order
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
          padding: '0 3rem'
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              Welcome back, {customer?.contact_name || 'Customer'}!
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Total Orders</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{orders.length}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>In Production</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                  {orders.filter(o => o.status === 'in_production').length}
                </div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Completed</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                  {orders.filter(o => o.status === 'complete' || o.status === 'shipped').length}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '2rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Order History</h2>
              <button
                onClick={loadDashboard}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem'
                }}
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>

            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>No orders yet. Start by creating your first order!</p>
                <button
                  onClick={() => router.push('/')}
                  style={{
                    marginTop: '1rem',
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
                  Create First Order
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map(order => (
                  <div
                    key={order.id}
                    style={{
                      padding: '1.5rem',
                      background: 'rgba(51, 65, 85, 0.5)',
                      borderRadius: '8px',
                      border: '1px solid #334155'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                          {order.product_type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                          Order ID: {order.id.substring(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <div style={{
                        padding: '0.5rem 1rem',
                        background: `${getStatusColor(order.status)}22`,
                        border: `1px solid ${getStatusColor(order.status)}`,
                        borderRadius: '8px',
                        color: getStatusColor(order.status),
                        fontSize: '0.875rem',
                        fontWeight: 'bold'
                      }}>
                        {getStatusLabel(order.status)}
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Quantity</div>
                        <div style={{ fontWeight: 'bold' }}>{order.quantity.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Paper</div>
                        <div style={{ fontWeight: 'bold' }}>{order.paper_type}</div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Price</div>
                        <div style={{ fontWeight: 'bold', color: '#10b981' }}>
                          ${parseFloat(order.final_price).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Date</div>
                        <div style={{ fontWeight: 'bold' }}>
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        // Reorder functionality - coming next
                        alert('Reorder feature coming soon!');
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <RefreshCw size={14} />
                      Reorder
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
