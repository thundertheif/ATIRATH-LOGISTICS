// components/AnimatedCounter.jsx
import React, { useState, useEffect, useRef } from 'react';

export default function AnimatedCounter({ target, duration = 2000, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    let start = 0;
    const increment = target / (duration / 16);
    let animationFrame;

    const animate = () => {
      start += increment;
      if (start < target) {
        setCount(Math.floor(start));
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, target, duration]);

  return (
    <span ref={ref} aria-live="polite">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}