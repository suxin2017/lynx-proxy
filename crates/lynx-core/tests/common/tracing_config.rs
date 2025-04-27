use tracing_subscriber::{
    Layer, filter::FilterFn, fmt, layer::SubscriberExt, util::SubscriberInitExt,
};

pub fn init_tracing() {
    let my_filter = FilterFn::new(|metadata| {
        // Only enable spans or events with the target "interesting_things"
        metadata.target().starts_with("lynx_core")
    });
    let _ = tracing_subscriber::registry()
        .with(
            fmt::layer()
                .with_ansi(true)
                .with_level(true)
                .with_target(true)
                .with_file(true)
                .with_line_number(true)
                .with_filter(my_filter),
        )
        .try_init();
}
