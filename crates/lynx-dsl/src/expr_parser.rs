use crate::ast::{AndExpr, Expr, NotExpr, OrExpr, Span};
use crate::error::ParseError;
use crate::parser::parse_primary_fragment;

pub fn parse_expression(source: &str, base_offset: usize) -> Result<Option<Expr>, ParseError> {
    let trimmed = source.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    let local_start = source.find(trimmed).unwrap_or(0);
    let absolute_start = base_offset + local_start;
    let or = parse_or_expression(trimmed, absolute_start)?;
    let span = Span::new(absolute_start, absolute_start + trimmed.len());
    Ok(Some(Expr { or, span }))
}

/// Like [`parse_expression`], but keeps successfully parsed terms and reports the first error.
pub fn parse_expression_partial(
    source: &str,
    base_offset: usize,
) -> (Option<Expr>, Option<ParseError>) {
    let trimmed = source.trim();
    if trimmed.is_empty() {
        return (None, None);
    }

    let local_start = source.find(trimmed).unwrap_or(0);
    let absolute_start = base_offset + local_start;
    let (or, error) = parse_or_expression_partial(trimmed, absolute_start);
    if or.branches.is_empty() {
        return (None, error);
    }
    let span = Span::new(absolute_start, absolute_start + trimmed.len());
    (Some(Expr { or, span }), error)
}

fn parse_or_expression(source: &str, base_offset: usize) -> Result<OrExpr, ParseError> {
    let parts = split_top_level(source, LogicOp::Or, base_offset, false)?;
    let mut branches = Vec::with_capacity(parts.len());
    for part in parts {
        branches.push(parse_and_expression(part.text, base_offset + part.start)?);
    }
    let span = Span::new(base_offset, base_offset + source.len());
    Ok(OrExpr { branches, span })
}

fn parse_or_expression_partial(source: &str, base_offset: usize) -> (OrExpr, Option<ParseError>) {
    let parts = match split_top_level(source, LogicOp::Or, base_offset, true) {
        Ok(parts) => parts,
        Err(error) => {
            return (
                OrExpr {
                    branches: Vec::new(),
                    span: Span::new(base_offset, base_offset + source.len()),
                },
                Some(error),
            );
        }
    };

    let mut branches = Vec::with_capacity(parts.len());
    let mut error = None;
    for part in parts {
        let (and_expr, part_error) =
            parse_and_expression_partial(part.text, base_offset + part.start);
        if !and_expr.terms.is_empty() {
            branches.push(and_expr);
        }
        if let Some(part_error) = part_error {
            error = Some(part_error);
            break;
        }
    }

    let span = Span::new(base_offset, base_offset + source.len());
    (OrExpr { branches, span }, error)
}

fn parse_and_expression(source: &str, base_offset: usize) -> Result<AndExpr, ParseError> {
    let parts = split_top_level(source, LogicOp::And, base_offset, false)?;
    let mut terms = Vec::with_capacity(parts.len());
    for part in parts {
        terms.push(parse_not_expression(part.text, base_offset + part.start)?);
    }
    let span = Span::new(base_offset, base_offset + source.len());
    Ok(AndExpr { terms, span })
}

fn parse_and_expression_partial(source: &str, base_offset: usize) -> (AndExpr, Option<ParseError>) {
    let parts = match split_top_level(source, LogicOp::And, base_offset, true) {
        Ok(parts) => parts,
        Err(error) => {
            return (
                AndExpr {
                    terms: Vec::new(),
                    span: Span::new(base_offset, base_offset + source.len()),
                },
                Some(error),
            );
        }
    };

    let mut terms = Vec::with_capacity(parts.len());
    let mut error = None;
    for part in parts {
        match parse_not_expression(part.text, base_offset + part.start) {
            Ok(term) => terms.push(term),
            Err(part_error) => {
                error = Some(part_error);
                break;
            }
        }
    }

    let span = Span::new(base_offset, base_offset + source.len());
    (AndExpr { terms, span }, error)
}

fn parse_not_expression(source: &str, base_offset: usize) -> Result<NotExpr, ParseError> {
    let trimmed = source.trim();
    if trimmed.is_empty() {
        return Err(ParseError::Syntax {
            span: Span::new(base_offset, base_offset + 1),
            message: "empty expression term".to_string(),
        });
    }

    let term_start = base_offset + source.find(trimmed).unwrap_or(0);
    if trimmed.len() >= 4 && trimmed[..4].eq_ignore_ascii_case("NOT ") {
        let rest = &trimmed[4..];
        return Ok(NotExpr::Not {
            inner: Box::new(parse_not_expression(rest, term_start + 4)?),
            span: Span::new(term_start, term_start + trimmed.len()),
        });
    }
    if trimmed.len() >= 3 && trimmed[..3].eq_ignore_ascii_case("NOT") {
        let boundary_ok = trimmed.len() == 3 || !trimmed.as_bytes()[3].is_ascii_alphanumeric();
        if boundary_ok {
            return Err(ParseError::Syntax {
                span: Span::new(term_start, term_start + trimmed.len()),
                message: "missing operand after NOT".to_string(),
            });
        }
    }

    let primary = parse_primary_fragment(trimmed, term_start)?;
    Ok(NotExpr::Primary(primary))
}

#[derive(Clone, Copy)]
enum LogicOp {
    And,
    Or,
}

struct Segment<'a> {
    start: usize,
    text: &'a str,
}

fn split_top_level(
    source: &str,
    op: LogicOp,
    base_offset: usize,
    allow_unclosed_group: bool,
) -> Result<Vec<Segment<'_>>, ParseError> {
    let mut segments = Vec::new();
    let mut depth = 0usize;
    let mut start = 0usize;
    let bytes = source.as_bytes();
    let mut index = 0usize;

    while index < bytes.len() {
        let ch = bytes[index] as char;
        if ch == '(' {
            depth += 1;
            index += 1;
            continue;
        }
        if ch == ')' {
            if depth == 0 {
                return Err(ParseError::Syntax {
                    span: Span::new(base_offset + index, base_offset + index + 1),
                    message: "unexpected ')'".to_string(),
                });
            }
            depth -= 1;
            index += 1;
            continue;
        }
        if depth == 0 && ch == '#' {
            while index < bytes.len() && bytes[index] != b'\n' {
                index += 1;
            }
            continue;
        }
        if depth == 0 && matches_keyword(bytes, index, op) {
            let segment = &source[start..index];
            if !segment.trim().is_empty() {
                segments.push(Segment {
                    start,
                    text: segment,
                });
            }
            index = skip_keyword(bytes, index, op);
            start = index;
            continue;
        }
        index += 1;
    }

    if depth != 0 {
        if allow_unclosed_group {
            let segment = &source[start..];
            if !segment.trim().is_empty() {
                segments.push(Segment {
                    start,
                    text: segment,
                });
            }
            return Ok(segments);
        }
        return Err(ParseError::Syntax {
            span: Span::new(
                base_offset + source.len().saturating_sub(1),
                base_offset + source.len(),
            ),
            message: "unclosed '('".to_string(),
        });
    }

    let segment = &source[start..];
    if !segment.trim().is_empty() {
        segments.push(Segment {
            start,
            text: segment,
        });
    }

    if segments.is_empty() {
        return Err(ParseError::Syntax {
            span: Span::new(base_offset, base_offset + source.len().max(1)),
            message: "empty expression".to_string(),
        });
    }

    Ok(segments)
}

fn matches_keyword(bytes: &[u8], index: usize, op: LogicOp) -> bool {
    let keyword: &[u8] = match op {
        LogicOp::And => b"AND",
        LogicOp::Or => b"OR",
    };
    if index + keyword.len() > bytes.len() {
        return false;
    }
    if !bytes[index..index + keyword.len()]
        .iter()
        .zip(keyword.iter())
        .all(|(left, right)| left.eq_ignore_ascii_case(right))
    {
        return false;
    }
    let before_ok = index == 0 || !bytes[index - 1].is_ascii_alphanumeric();
    let after_index = index + keyword.len();
    let after_ok = after_index >= bytes.len() || !bytes[after_index].is_ascii_alphanumeric();
    before_ok && after_ok
}

fn skip_keyword(bytes: &[u8], index: usize, op: LogicOp) -> usize {
    let _ = bytes;
    index
        + match op {
            LogicOp::And => 3,
            LogicOp::Or => 2,
        }
}

pub fn parse_grouped_expression(source: &str, base_offset: usize) -> Result<Expr, ParseError> {
    let trimmed = source.trim();
    let inner_start = trimmed
        .strip_prefix('(')
        .and_then(|value| value.strip_suffix(')'))
        .ok_or_else(|| ParseError::Syntax {
            span: Span::new(base_offset, base_offset + trimmed.len().max(1)),
            message: "invalid grouped expression".to_string(),
        })?;
    let inner_offset = base_offset + (trimmed.find('(').unwrap_or(0) + 1);
    parse_expression(inner_start, inner_offset).and_then(|expr| {
        expr.ok_or_else(|| ParseError::Syntax {
            span: Span::new(inner_offset, inner_offset + inner_start.len().max(1)),
            message: "empty grouped expression".to_string(),
        })
    })
}
