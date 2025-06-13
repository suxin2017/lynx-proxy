import React, { useState, useEffect } from 'react';
import { Button, notification } from 'antd';
import { RiDownloadLine } from '@remixicon/react';
import { installPWA } from '../pwa';

export const PWAInstallPrompt: React.FC = () => {
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = () => {
      setShowInstall(true);
    };

    const handleAppInstalled = () => {
      setShowInstall(false);
      notification.success({
        message: 'App Installed',
        description: 'Lynx Proxy has been installed successfully!',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    try {
      await installPWA();
      setShowInstall(false);
    } catch (error) {
      console.error('Failed to install PWA:', error);
    }
  };

  if (!showInstall) {
    return null;
  }

  return (
    <Button
      type="primary"
      ghost
      icon={<RiDownloadLine size={16} />}
      onClick={handleInstall}
      size="small"
    >
      Install App
    </Button>
  );
};
