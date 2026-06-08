use crate::ast::Span;

/// Clamp a byte range to `source` and align both ends to valid UTF-8 char boundaries.
pub fn clamp_byte_range(source: &str, start: usize, end: usize) -> (usize, usize) {
    let mut start = start.min(source.len());
    let mut end = end.max(start).min(source.len());
    while start < end && !source.is_char_boundary(start) {
        start += 1;
    }
    while end > start && !source.is_char_boundary(end) {
        end -= 1;
    }
    (start, end)
}

pub fn span_from_pair(pair: pest::Span, source: &str) -> Span {
    let start = pair.start();
    let end = pair.end();
    let _ = source;
    Span::new(start, end)
}

pub fn span_from_range(start: usize, end: usize) -> Span {
    Span::new(start, end)
}
