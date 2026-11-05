import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export const TicketQRCode = ({ value, size = 120, label = 'Scan to Check-In at Clinic' }) => {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!value) return;

    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: {
        dark: '#580016', // EARIST Dark Crimson
        light: '#FFFFFF'
      }
    })
      .then(url => setDataUrl(url))
      .catch(err => console.error('QR Code render error:', err));
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className="bg-slate-100 rounded-lg animate-pulse flex items-center justify-center text-[10px] text-slate-400"
      >
        Generating QR...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs inline-block">
        <img 
          src={dataUrl} 
          alt={`Check-in QR for ${value}`} 
          style={{ width: size, height: size }}
          className="rounded-lg object-contain"
        />
      </div>
      {label && (
        <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mt-1.5 text-center">
          {label}
        </span>
      )}
    </div>
  );
};

