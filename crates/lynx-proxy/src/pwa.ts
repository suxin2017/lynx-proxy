// PWA service worker registration
export const registerSW = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  // New content is available, show update notification
                  // if (confirm('新版本可用，是否刷新页面以更新？')) {
                  window.location.reload();
                  // }
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// Install prompt for PWA
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const setupInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e as BeforeInstallPromptEvent;

    // Show install button or notification
    showInstallPromotion();
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    hideInstallPromotion();
  });
};

export const showInstallPromotion = () => {
  // You can implement a custom install promotion UI here
  console.log('App can be installed');
};

export const hideInstallPromotion = () => {
  deferredPrompt = null;
};

export const installPWA = async () => {
  if (deferredPrompt) {
    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    deferredPrompt = null;
  }
};
