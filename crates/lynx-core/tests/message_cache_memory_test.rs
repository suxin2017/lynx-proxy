use bytes::Bytes;
use lynx_core::layers::message_package_layer::message_event_data::MessageEventBody;
use std::alloc::{GlobalAlloc, Layout, System};
use std::hint::black_box;
use std::sync::Mutex;
use std::sync::atomic::{AtomicUsize, Ordering};

struct CountingAllocator;

static TOTAL_ALLOCATED: AtomicUsize = AtomicUsize::new(0);
static CURRENT_LIVE: AtomicUsize = AtomicUsize::new(0);
static PEAK_LIVE: AtomicUsize = AtomicUsize::new(0);
static RUN_LOCK: Mutex<()> = Mutex::new(());

#[global_allocator]
static GLOBAL_ALLOCATOR: CountingAllocator = CountingAllocator;

fn update_peak(value: usize) {
    let mut peak = PEAK_LIVE.load(Ordering::Relaxed);
    while value > peak {
        match PEAK_LIVE.compare_exchange_weak(peak, value, Ordering::Relaxed, Ordering::Relaxed) {
            Ok(_) => break,
            Err(current) => peak = current,
        }
    }
}

fn saturating_add_atomic(counter: &AtomicUsize, delta: usize) -> usize {
    let mut observed = counter.load(Ordering::Relaxed);
    loop {
        let next = observed.saturating_add(delta);
        match counter.compare_exchange_weak(observed, next, Ordering::Relaxed, Ordering::Relaxed) {
            Ok(_) => return next,
            Err(current) => observed = current,
        }
    }
}

fn saturating_sub_atomic(counter: &AtomicUsize, delta: usize) -> usize {
    let mut observed = counter.load(Ordering::Relaxed);
    loop {
        let next = observed.saturating_sub(delta);
        match counter.compare_exchange_weak(observed, next, Ordering::Relaxed, Ordering::Relaxed) {
            Ok(_) => return next,
            Err(current) => observed = current,
        }
    }
}

unsafe impl GlobalAlloc for CountingAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let ptr = unsafe { System.alloc(layout) };
        if !ptr.is_null() {
            let size = layout.size();
            let _ = saturating_add_atomic(&TOTAL_ALLOCATED, size);
            let live = saturating_add_atomic(&CURRENT_LIVE, size);
            update_peak(live);
        }
        ptr
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        unsafe { System.dealloc(ptr, layout) };
        let _ = saturating_sub_atomic(&CURRENT_LIVE, layout.size());
    }

    unsafe fn realloc(&self, ptr: *mut u8, layout: Layout, new_size: usize) -> *mut u8 {
        let new_ptr = unsafe { System.realloc(ptr, layout, new_size) };
        if !new_ptr.is_null() {
            let _ = saturating_add_atomic(&TOTAL_ALLOCATED, new_size);
            let old_size = layout.size();
            let live = if new_size >= old_size {
                saturating_add_atomic(&CURRENT_LIVE, new_size - old_size)
            } else {
                saturating_sub_atomic(&CURRENT_LIVE, old_size - new_size)
            };
            update_peak(live);
        }
        new_ptr
    }
}

fn reset_allocator_stats() {
    TOTAL_ALLOCATED.store(0, Ordering::Relaxed);
    CURRENT_LIVE.store(0, Ordering::Relaxed);
    PEAK_LIVE.store(0, Ordering::Relaxed);
}

fn measure_allocation_cost<F>(f: F) -> (usize, usize)
where
    F: FnOnce(),
{
    reset_allocator_stats();
    f();
    (
        TOTAL_ALLOCATED.load(Ordering::Relaxed),
        PEAK_LIVE.load(Ordering::Relaxed),
    )
}

fn build_chunks(chunk_count: usize, chunk_size: usize) -> Vec<Bytes> {
    (0..chunk_count)
        .map(|i| {
            let mut buf = vec![0u8; chunk_size];
            buf[0] = (i % 255) as u8;
            Bytes::from(buf)
        })
        .collect()
}

fn append_with_legacy_strategy(chunks: &[Bytes]) -> Vec<u8> {
    let mut aggregate = Bytes::new();
    for chunk in chunks {
        let mut copied = aggregate.to_vec();
        copied.extend_from_slice(chunk.as_ref());
        aggregate = Bytes::from(copied);
    }
    aggregate.to_vec()
}

fn append_with_current_strategy(chunks: &[Bytes]) -> Vec<u8> {
    let mut body = MessageEventBody::default();
    for chunk in chunks {
        body.extend_from_bytes(chunk.clone());
    }
    body.as_bytes().to_vec()
}

#[test]
fn body_append_behavior_is_unchanged() {
    let guard = RUN_LOCK.lock().expect("lock test");
    let _ = &guard;

    let chunks = build_chunks(32, 1024);
    let legacy = append_with_legacy_strategy(&chunks);
    let current = append_with_current_strategy(&chunks);

    assert_eq!(legacy, current);
}

#[test]
fn memory_allocation_is_lower_than_legacy_strategy() {
    let guard = RUN_LOCK.lock().expect("lock test");
    let _ = &guard;

    let chunks = build_chunks(256, 8 * 1024);

    let (legacy_total_allocated, legacy_peak_live) = measure_allocation_cost(|| {
        let data = append_with_legacy_strategy(&chunks);
        black_box(data.len());
    });

    let (current_total_allocated, current_peak_live) = measure_allocation_cost(|| {
        let data = append_with_current_strategy(&chunks);
        black_box(data.len());
    });

    assert!(
        current_total_allocated < legacy_total_allocated / 2,
        "expected current total allocation ({}) to be much lower than legacy ({})",
        current_total_allocated,
        legacy_total_allocated
    );

    assert!(
        current_peak_live < legacy_peak_live,
        "expected current peak live bytes ({}) to be lower than legacy ({})",
        current_peak_live,
        legacy_peak_live
    );
}

#[test]
fn current_strategy_allocation_growth_is_near_linear() {
    let guard = RUN_LOCK.lock().expect("lock test");
    let _ = &guard;

    let chunks_small = build_chunks(64, 8 * 1024);
    let chunks_large = build_chunks(128, 8 * 1024);

    let (small_total_allocated, _) = measure_allocation_cost(|| {
        let data = append_with_current_strategy(&chunks_small);
        black_box(data.len());
    });

    let (large_total_allocated, _) = measure_allocation_cost(|| {
        let data = append_with_current_strategy(&chunks_large);
        black_box(data.len());
    });

    assert!(
        large_total_allocated < small_total_allocated * 3,
        "expected near-linear growth, got small={} large={}",
        small_total_allocated,
        large_total_allocated
    );
}

#[test]
#[ignore = "stress test for local verification"]
fn memory_allocation_stress_is_lower_than_legacy_strategy() {
    let guard = RUN_LOCK.lock().expect("lock test");
    let _ = &guard;

    // 1024 * 16KiB ~= 16MiB payload assembled from chunks.
    let chunks = build_chunks(1024, 16 * 1024);

    let (legacy_total_allocated, legacy_peak_live) = measure_allocation_cost(|| {
        let data = append_with_legacy_strategy(&chunks);
        black_box(data.len());
    });

    let (current_total_allocated, current_peak_live) = measure_allocation_cost(|| {
        let data = append_with_current_strategy(&chunks);
        black_box(data.len());
    });

    assert!(
        current_total_allocated < legacy_total_allocated / 3,
        "expected stress current total allocation ({}) < legacy/3 ({})",
        current_total_allocated,
        legacy_total_allocated / 3
    );

    // Peak live bytes can jitter slightly due to allocator internals; require
    // no meaningful regression while still enforcing a strong total-allocation win.
    const PEAK_LIVE_TOLERANCE_BYTES: usize = 512 * 1024;
    assert!(
        current_peak_live <= legacy_peak_live + PEAK_LIVE_TOLERANCE_BYTES,
        "expected stress current peak live ({}) <= legacy + tolerance ({})",
        current_peak_live,
        legacy_peak_live + PEAK_LIVE_TOLERANCE_BYTES
    );
}
