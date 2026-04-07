import { useEffect } from 'react';

const useTemplateScripts = () => {
  useEffect(() => {
    // Load scripts asynchronously for faster page load
    const scripts = [
      '/assets/vendor/bootstrap/js/bootstrap.bundle.min.js',
      '/assets/vendor/aos/aos.js',
      '/assets/vendor/glightbox/js/glightbox.min.js',
      '/assets/vendor/purecounter/purecounter_vanilla.js',
      '/assets/vendor/swiper/swiper-bundle.min.js',
      '/assets/js/main.js'
    ];

    const loadScript = (src) => {
      return new Promise((resolve) => {
        // Check if script already exists
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve(existing);
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true; // Load asynchronously for better performance
        script.defer = true;
        script.onload = () => resolve(script);
        script.onerror = () => {
          console.warn(`Failed to load script: ${src}`);
          resolve(script); // Resolve anyway to not block other scripts
        };
        document.body.appendChild(script);
      });
    };

    // Load all scripts in parallel for faster loading
    Promise.all(scripts.map(src => loadScript(src)))
      .then(() => {
        // Initialize AOS animations if available
        if (window.AOS) {
          window.AOS.init({
            duration: 600,
            easing: 'ease-in-out',
            once: true,
            mirror: false
          });
        }
      })
      .catch(error => {
        console.error('Error loading template scripts:', error);
      });

    // No cleanup - scripts persist across navigation for better performance
  }, []);
};

export default useTemplateScripts;
