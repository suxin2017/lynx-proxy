use serde::{Deserialize, Serialize};

/// Chrome DevTools-style network throttling preset
#[derive(Debug, Serialize, Deserialize, Clone, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ThrottlePreset {
    #[default]
    Fast3G,
    Slow3G,
    Offline,
    Custom,
}

/// Throttle handler configuration (latency + upload/download bandwidth)
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ThrottleHandlerConfig {
    pub preset: ThrottlePreset,
    /// Used when preset is Custom; download speed in Kbps
    pub download_kbps: Option<u64>,
    /// Used when preset is Custom; upload speed in Kbps
    pub upload_kbps: Option<u64>,
    /// Used when preset is Custom; round-trip latency in milliseconds
    pub latency_ms: Option<u64>,
}

/// Resolved throttle parameters applied at runtime
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EffectiveThrottle {
    pub offline: bool,
    pub download_kbps: u64,
    pub upload_kbps: u64,
    pub latency_ms: u64,
}

impl Default for ThrottleHandlerConfig {
    fn default() -> Self {
        Self {
            preset: ThrottlePreset::Slow3G,
            download_kbps: None,
            upload_kbps: None,
            latency_ms: None,
        }
    }
}

impl ThrottleHandlerConfig {
    pub fn resolve_effective(&self) -> EffectiveThrottle {
        match self.preset {
            ThrottlePreset::Offline => EffectiveThrottle {
                offline: true,
                download_kbps: 0,
                upload_kbps: 0,
                latency_ms: 0,
            },
            ThrottlePreset::Fast3G => EffectiveThrottle {
                offline: false,
                download_kbps: 1600,
                upload_kbps: 750,
                latency_ms: 150,
            },
            ThrottlePreset::Slow3G => EffectiveThrottle {
                offline: false,
                download_kbps: 500,
                upload_kbps: 400,
                latency_ms: 400,
            },
            ThrottlePreset::Custom => EffectiveThrottle {
                offline: false,
                download_kbps: self.download_kbps.unwrap_or(0),
                upload_kbps: self.upload_kbps.unwrap_or(0),
                latency_ms: self.latency_ms.unwrap_or(0),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_preset_fast3g() {
        let config = ThrottleHandlerConfig {
            preset: ThrottlePreset::Fast3G,
            ..Default::default()
        };
        let effective = config.resolve_effective();
        assert!(!effective.offline);
        assert_eq!(effective.download_kbps, 1600);
        assert_eq!(effective.upload_kbps, 750);
        assert_eq!(effective.latency_ms, 150);
    }

    #[test]
    fn test_preset_slow3g() {
        let config = ThrottleHandlerConfig::default();
        let effective = config.resolve_effective();
        assert!(!effective.offline);
        assert_eq!(effective.download_kbps, 500);
        assert_eq!(effective.upload_kbps, 400);
        assert_eq!(effective.latency_ms, 400);
    }

    #[test]
    fn test_preset_offline() {
        let config = ThrottleHandlerConfig {
            preset: ThrottlePreset::Offline,
            ..Default::default()
        };
        let effective = config.resolve_effective();
        assert!(effective.offline);
    }

    #[test]
    fn test_preset_custom() {
        let config = ThrottleHandlerConfig {
            preset: ThrottlePreset::Custom,
            download_kbps: Some(100),
            upload_kbps: Some(50),
            latency_ms: Some(200),
        };
        let effective = config.resolve_effective();
        assert!(!effective.offline);
        assert_eq!(effective.download_kbps, 100);
        assert_eq!(effective.upload_kbps, 50);
        assert_eq!(effective.latency_ms, 200);
    }

    #[test]
    fn test_throttle_handler_serialization() {
        let handler = ThrottleHandlerConfig {
            preset: ThrottlePreset::Slow3G,
            download_kbps: None,
            upload_kbps: None,
            latency_ms: None,
        };
        let json = serde_json::to_string(&handler).unwrap();
        let deserialized: ThrottleHandlerConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(handler.preset, deserialized.preset);
    }
}
