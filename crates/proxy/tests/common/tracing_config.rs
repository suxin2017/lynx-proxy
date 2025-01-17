use futures_util::SinkExt;
use tracing_subscriber::{
    filter::FilterFn, fmt, layer::SubscriberExt, util::SubscriberInitExt, Layer,
};



pub fn init_tracing() {
    let my_filter = FilterFn::new(|metadata| {
        // Only enable spans or events with the target "interesting_things"
        {
            metadata.target().starts_with("proxy")
        }
    });
    tracing_subscriber::registry()
        .with(fmt::layer().with_filter(my_filter))
        .init();
}
