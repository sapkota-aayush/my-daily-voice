'use client';

import { useState, useEffect } from 'react';

interface Resident {
  id: string;
  name: string;
  roomNumber: string;
  photo: string;
  status: 'in' | 'out';
  lastCheckIn?: string;
  lastCheckOut?: string;
}

export default function FrontDeskPage() {
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mock resident ID for testing (in production, this would come from NFC/QR scan)
  const mockResidentId = 'resident-001';

  // Auto-load resident when page opens
  useEffect(() => {
    fetchResident(mockResidentId);
  }, []);

  const fetchResident = async (residentId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/frontdesk?id=${residentId}`);
      const data = await response.json();
      
      console.log('API Response:', data); // Debug log
      
      if (data.success && data.resident) {
        console.log('Setting resident:', data.resident); // Debug log
        setResident(data.resident);
      } else {
        setMessage({ type: 'error', text: data.error || 'Resident not found' });
        setResident(null);
      }
    } catch (error: any) {
      console.error('Fetch error:', error); // Debug log
      setMessage({ type: 'error', text: 'Failed to fetch resident information' });
      setResident(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogAction = async (action: 'in' | 'out') => {
    if (!resident) return;
    
    setActionLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/frontdesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentId: resident.id,
          action,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResident(data.resident);
        setMessage({ 
          type: 'success', 
          text: `${resident.name} logged ${action === 'in' ? 'in' : 'out'} at ${new Date(data.logEntry.timestamp).toLocaleTimeString()}` 
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to log action' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to log action. Please try again.' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-xl">ASC</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Resident Check-In/Out</h1>
                <p className="text-sm text-gray-500">Cataraqui Heights Retirement Residence</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Message Display */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <p className="font-medium">{message.text}</p>
          </div>
        )}


        {/* Resident Display */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 border border-gray-200 text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center animate-pulse">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <p className="text-gray-600">Loading resident information...</p>
          </div>
        ) : resident ? (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            {/* Status Banner */}
            <div
              className={`h-2 ${
                resident.status === 'in' ? 'bg-green-600' : 'bg-red-600'
              }`}
            />

            <div className="p-4 sm:p-6 md:p-8">
              {/* Photo Section - Large and Prominent, Displayed First - Mobile Responsive */}
              <div className="flex justify-center mb-6 sm:mb-8">
                <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border-4 sm:border-4 border-gray-300 shadow-2xl">
                  <img
                    src={resident.photo}
                    alt={resident.name}
                    className="w-full h-auto max-h-[60vh] sm:max-h-[500px] object-contain"
                    style={{ imageRendering: 'high-quality', objectPosition: 'center top' }}
                    onError={(e) => {
                      // Show placeholder if image fails to load
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent && !parent.querySelector('.fallback-placeholder')) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'fallback-placeholder w-full h-[300px] sm:h-[400px] flex items-center justify-center bg-gray-200';
                        placeholder.innerHTML = `
                          <div class="text-center">
                            <svg class="w-32 h-32 mx-auto text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                            <p class="text-gray-500 text-sm mt-2">Photo not found</p>
                          </div>
                        `;
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Details Section - Name and Status - Mobile Responsive */}
              <div className="text-center space-y-4 sm:space-y-5">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">{resident.name}</h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                  <span className="text-lg sm:text-xl md:text-2xl text-gray-600">Room {resident.roomNumber}</span>
                  <span
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-semibold ${
                      resident.status === 'in'
                        ? 'bg-green-100 text-green-800 border-2 border-green-300'
                        : 'bg-red-100 text-red-800 border-2 border-red-300'
                    }`}
                  >
                    {resident.status === 'in' ? '✓ In Residence' : '✗ Out of Residence'}
                  </span>
                </div>
              </div>

              {/* Action Buttons - Non-functional for now - Mobile Responsive */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 max-w-md mx-auto w-full px-4 sm:px-0">
                <button
                  className="w-full sm:flex-1 px-6 sm:px-8 py-4 sm:py-5 rounded-lg font-semibold text-white text-base sm:text-lg transition-all shadow-md hover:shadow-lg bg-green-600 hover:bg-green-700 active:bg-green-800"
                >
                  ✓ Sign In
                </button>
                <button
                  className="w-full sm:flex-1 px-6 sm:px-8 py-4 sm:py-5 rounded-lg font-semibold text-white text-base sm:text-lg transition-all shadow-md hover:shadow-lg bg-red-600 hover:bg-red-700 active:bg-red-800"
                >
                  ✗ Sign Out
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 border border-gray-200 text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Resident Selected</h3>
            <p className="text-gray-600">
              Scan a resident card or use the test buttons above to display information
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-gray-50 border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">Cataraqui Heights Retirement Residence</p>
          <p>Front Desk System - For Staff Use Only</p>
        </div>
      </footer>
    </div>
  );
}

