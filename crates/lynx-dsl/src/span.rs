use crate::ast::Span;

pub fn span_from_pair(pair: pest::Span, source: &str) -> Span {
    let start = pair.start();
    let end = pair.end();
    let _ = source;
    Span::new(start, end)
}

pub fn span_from_range(start: usize, end: usize) -> Span {
    Span::new(start, end)
}
