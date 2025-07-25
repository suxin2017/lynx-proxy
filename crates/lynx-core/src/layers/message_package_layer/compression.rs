use bytes::Bytes;
use http::HeaderMap;
use tokio_stream::{StreamExt, wrappers::ReceiverStream};
use tracing::trace;
use async_compression::tokio::bufread::{BrotliDecoder, GzipDecoder, ZlibDecoder};
use tokio::io::BufReader;
use tokio_util::io::{ReaderStream, StreamReader};

use super::message_event_store::MessageEvent;
use super::super::trace_id_layer::service::TraceId;

/// 根据响应头创建解压流
pub async fn process_compressed_body(
    headers: &HeaderMap,
    body_stream: ReceiverStream<Bytes>,
    sender: tokio::sync::broadcast::Sender<MessageEvent>,
    trace_id: TraceId,
) {
    let error_stream = body_stream.map(|bytes| Ok::<Bytes, std::io::Error>(bytes));

    if let Some(encoding) = headers.get("content-encoding") {
        match encoding.to_str().unwrap_or("").to_lowercase().as_str() {
            "gzip" => {
                let reader = StreamReader::new(error_stream);
                let buf_reader = BufReader::new(reader);
                let decoder = GzipDecoder::new(buf_reader);
                let mut stream = ReaderStream::new(decoder);

                while let Some(result) = stream.next().await {
                    let trace_id = trace_id.clone();
                    match result {
                        Ok(data) => {
                            trace!("Dispatching OnResponseBody event (gzip)");
                            let _ = sender.send(MessageEvent::OnResponseBody(trace_id, Some(data)));
                        }
                        Err(e) => {
                            trace!("Gzip decompression error: {:?}", e);
                            break;
                        }
                    }
                }
            }
            "deflate" => {
                let reader = StreamReader::new(error_stream);
                let buf_reader = BufReader::new(reader);
                // 使用 ZlibDecoder 而不是 DeflateDecoder，因为 HTTP deflate 通常是 zlib 格式
                let decoder = ZlibDecoder::new(buf_reader);
                let mut stream = ReaderStream::new(decoder);

                while let Some(result) = stream.next().await {
                    let trace_id = trace_id.clone();
                    match result {
                        Ok(data) => {
                            trace!("Dispatching OnResponseBody event (deflate/zlib)");
                            let _ = sender.send(MessageEvent::OnResponseBody(trace_id, Some(data)));
                        }
                        Err(e) => {
                            trace!("Zlib decompression error: {:?}", e);
                            break;
                        }
                    }
                }
            }
            "br" => {
                let reader = StreamReader::new(error_stream);
                let buf_reader = BufReader::new(reader);
                let decoder = BrotliDecoder::new(buf_reader);
                let mut stream = ReaderStream::new(decoder);

                while let Some(result) = stream.next().await {
                    let trace_id = trace_id.clone();
                    match result {
                        Ok(data) => {
                            trace!("Dispatching OnResponseBody event (brotli)");
                            let _ = sender.send(MessageEvent::OnResponseBody(trace_id, Some(data)));
                        }
                        Err(e) => {
                            trace!("Brotli decompression error: {:?}", e);
                            break;
                        }
                    }
                }
            }
            _ => {
                let mut stream = error_stream;
                while let Some(result) = stream.next().await {
                    let trace_id = trace_id.clone();
                    match result {
                        Ok(data) => {
                            trace!("Dispatching OnResponseBody event (raw)");
                            let _ = sender.send(MessageEvent::OnResponseBody(trace_id, Some(data)));
                        }
                        Err(_) => break,
                    }
                }
            }
        }
    } else {
        let mut stream = error_stream;
        while let Some(result) = stream.next().await {
            let trace_id = trace_id.clone();
            match result {
                Ok(data) => {
                    trace!("Dispatching OnResponseBody event (no compression)");
                    let _ = sender.send(MessageEvent::OnResponseBody(trace_id, Some(data)));
                }
                Err(_) => break,
            }
        }
    }

    let _ = sender.send(MessageEvent::OnResponseBody(trace_id, None));
}