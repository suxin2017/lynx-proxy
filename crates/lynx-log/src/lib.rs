use std::path::PathBuf;
use std::time::Duration;

use anyhow::Result;

use derive_builder::Builder;
use opentelemetry::KeyValue;
use opentelemetry::trace::TracerProvider as _;
use opentelemetry_otlp::{ExporterBuildError, Protocol, WithExportConfig};
use opentelemetry_sdk::Resource;
use opentelemetry_sdk::trace::{RandomIdGenerator, Sampler, Tracer};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{EnvFilter, Registry};

#[derive(Debug, Clone, Default)]
pub struct OpenTelemetryConfig {
    pub endpoint: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct FileAppenderConfig {
    pub file_path: PathBuf,
    pub dir_path: PathBuf,
}

pub fn open_telemetry_tracer(config: OpenTelemetryConfig) -> Result<Tracer, ExporterBuildError> {
    let mut otlp_exporter = opentelemetry_otlp::SpanExporter::builder()
        .with_http()
        .with_protocol(Protocol::HttpBinary)
        .with_timeout(Duration::from_secs(10));

    if let Some(endpoint) = config.endpoint {
        otlp_exporter = otlp_exporter.with_endpoint(endpoint);
    }

    let otlp_exporter = otlp_exporter.build()?;

    let tracer_provider = opentelemetry_sdk::trace::SdkTracerProvider::builder()
        .with_batch_exporter(otlp_exporter)
        .with_sampler(Sampler::AlwaysOn)
        .with_id_generator(RandomIdGenerator::default())
        .with_resource(
            Resource::builder_empty()
                .with_attributes([KeyValue::new("service.name", "lynx-server")])
                .build(),
        )
        .build();

    let tracer: opentelemetry_sdk::trace::Tracer = tracer_provider.tracer("lynx-server");

    Ok(tracer)
}

pub struct LogGuard {
    _appender_guard: Option<tracing_appender::non_blocking::WorkerGuard>,
}

#[derive(Builder, Clone, Debug, Default)]
#[builder(setter(prefix = "with"), default)]
pub struct LynxLog {
    console: bool,
    file: bool,
    otel: bool,
    otel_config: Option<OpenTelemetryConfig>,
    file_config: Option<FileAppenderConfig>,
}

impl LynxLog {
    pub async fn init(&self) -> Result<LogGuard> {
        let mut guard = LogGuard {
            _appender_guard: None,
        };
        Registry::default()
            .with(EnvFilter::from_default_env().add_directive("lynx_core=trace".parse()?))
            .with(self.console.then(|| {
                tracing_subscriber::fmt::layer()
                    .with_target(true)
                    .with_line_number(true)
                    .with_ansi(false)
            }))
            .with(self.file.then(|| {
                let file_appender = tracing_appender::rolling::daily(
                    self.file_config
                        .as_ref()
                        .map_or_else(|| PathBuf::from("logs"), |config| config.dir_path.clone()),
                    self.file_config.as_ref().map_or_else(
                        || PathBuf::from("lynx-server.log"),
                        |config| config.file_path.clone(),
                    ),
                );
                let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
                guard._appender_guard = Some(_guard);
                tracing_subscriber::fmt::layer()
                    .with_writer(non_blocking)
                    .with_target(true)
                    .with_line_number(true)
                    .with_ansi(false)
            }))
            .with(if self.otel {
                let otel_config = self.otel_config.clone().unwrap_or_default();
                match open_telemetry_tracer(otel_config) {
                    Ok(tracer) => Some(tracing_opentelemetry::layer().with_tracer(tracer)),
                    Err(e) => {
                        eprintln!("Failed to initialize OpenTelemetry tracer: {:?}", e);
                        None
                    }
                }
            } else {
                None
            })
            .init();

        Ok(guard)
    }
}
