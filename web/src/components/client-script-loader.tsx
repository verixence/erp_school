'use client';

import { useEffect } from 'react';

export default function ClientScriptLoader() {
  useEffect(() => {
    // Function to load a script with error handling
    const loadScript = (src: string, name: string) => {
      return new Promise((resolve, reject) => {
        // Check if script is already loaded
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve(true);
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;

        script.onload = () => {
          console.log(`${name} loaded successfully`);
          resolve(true);
        };

        script.onerror = (error) => {
          console.warn(`Failed to load ${name}:`, error);
          reject(error);
        };

        document.head.appendChild(script);
      });
    };

    // Load external scripts with error handling
    const loadExternalScripts = async () => {
      try {
        await loadScript(
          'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
          'JSZip'
        );
      } catch (error) {
        console.warn('JSZip failed to load, some features may not work:', error);
      }

      try {
        await loadScript(
          'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
          'html2pdf'
        );
      } catch (error) {
        console.warn('html2pdf failed to load, PDF generation may not work:', error);
      }
    };

    loadExternalScripts();
  }, []);

  return null; // This component doesn't render anything
} 