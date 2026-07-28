import React from 'react';

export default function ParallaxSection({ children, className = '' }) {
  return (
    <section className={className}>
      {children}
    </section>
  );
}