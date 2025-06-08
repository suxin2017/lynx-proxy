use crate::LogLevel;
use anyhow::Result;
use std::path::PathBuf;
use tracing::info;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::{EnvFilter, fmt, layer::SubscriberExt, util::SubscriberInitExt};

pub struct LogConfig {
    pub level: LogLevel,
    pub file_path: Option<PathBuf>,
    pub console_output: bool,
}

impl Default for LogConfig {
    fn default() -> Self {
        Self {
            level: LogLevel::Info,
            file_path: None,
            console_output: true,
        }
    }
}

impl LogConfig {
    pub fn new(level: LogLevel) -> Self {
        Self {
            level,
            ..Default::default()
        }
    }

    pub fn with_file<P: Into<PathBuf>>(mut self, path: P) -> Self {
        self.file_path = Some(path.into());
        self
    }

    pub fn with_console(mut self, enabled: bool) -> Self {
        self.console_output = enabled;
        self
    }

    pub fn init_logging(&self) -> Result<()> {
        let env_filter = if !matches!(self.level, LogLevel::Silent) {
            EnvFilter::from_default_env()
                .add_directive(format!("lynx_cli={}", self.level).parse()?)
                .add_directive(format!("lynx_core={}", self.level).parse()?)
        } else {
            EnvFilter::from_default_env()
        };

        let registry = tracing_subscriber::registry().with(env_filter);

        match (&self.file_path, self.console_output) {
            (Some(file_path), true) => {
                // Both file and console output
                self.ensure_log_dir(file_path)?;

                let file_appender = RollingFileAppender::builder()
                    .filename_prefix("lynx")
                    .filename_suffix(".log")
                    .rotation(Rotation::HOURLY)
                    .max_log_files(1)
                    .build(file_path)?;

                let (file_non_blocking, _file_guard) =
                    tracing_appender::non_blocking(file_appender);
                let file_layer = fmt::layer().with_ansi(false).with_writer(file_non_blocking);

                let console_layer = fmt::layer();

                registry.with(file_layer).with(console_layer).init();

                // Keep the guard alive for the lifetime of the application
                std::mem::forget(_file_guard);
            }
            (Some(file_path), false) => {
                // File output only
                self.ensure_log_dir(file_path)?;
                let file_appender = RollingFileAppender::builder()
                    .filename_prefix("lynx")
                    .filename_suffix(".log")
                    .rotation(Rotation::HOURLY)
                    .max_log_files(6)
                    .build(file_path)?;
                let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

                let file_layer = fmt::layer().with_ansi(false).with_writer(non_blocking);

                registry.with(file_layer).init();

                // Keep the guard alive for the lifetime of the application
                std::mem::forget(_guard);
            }
            (None, true) => {
                // Console output only
                let console_layer = fmt::layer();

                registry.with(console_layer).init();
            }
            (None, false) => {
                // No output (silent mode)
                registry.init();
            }
        }

        info!("Logging initialized with level: {}", self.level);
        Ok(())
    }

    fn ensure_log_dir(&self, file_path: &PathBuf) -> Result<()> {
        if let Some(parent) = file_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        Ok(())
    }

    pub fn lynx_log_file(project_dir: &PathBuf) -> PathBuf {
        let log_dir = project_dir.join("logs");
        log_dir
    }
}
