import React from 'react';
import { createRoot } from 'react-dom/client';

function MoonboundBootstrap() {
  return (
    <main style={{ minHeight: '100%', display: 'grid', placeItems: 'center', color: '#d6d1e6', fontFamily: 'system-ui, sans-serif' }}>
      <section style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ color: '#4edce5', letterSpacing: '.14em', textTransform: 'uppercase' }}>Moonbound · Survival Mission</p>
        <h1>Mission systems are being prepared</h1>
        <p>The game shell is ready for the Moon Base scene.</p>
      </section>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root application mount.');
createRoot(root).render(<MoonboundBootstrap />);
