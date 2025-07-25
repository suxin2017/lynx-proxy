use http::Response;
use http_body_util::{BodyExt, Full};
use hyper::body::Bytes;
use hyper::client::conn::http1;
use hyper::header::{CONNECTION, CONTENT_TYPE, HeaderMap, HeaderName, HeaderValue, USER_AGENT};
use hyper::{Method, Request, Version};
use hyper_util::rt::TokioIo;
use rustls::pki_types::ServerName;
use serde_json::json;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::net::TcpStream;
use tokio_rustls::{TlsConnector, rustls};
use tracing::instrument::WithSubscriber;
use tracing::{debug, error, info};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{self, EnvFilter, fmt};

/// 网络计时信息，对应浏览器开发者工具的 Network 标签页
#[derive(Debug, Clone)]
pub struct NetworkTiming {
    pub dns_lookup: Duration,
    pub tcp_connect: Duration,
    pub tls_handshake: Duration,
    pub request_sent: Duration,     // 请求发送
    pub waiting_ttfb: Duration,     // 等待首字节/响应头
    pub content_download: Duration, // 响应体下载
    pub total_time: Duration,
}

/// HTTPS 连接器
pub struct HttpsConnector {
    tls_connector: TlsConnector,
}

impl HttpsConnector {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let mut root_cert_store = rustls::RootCertStore::empty();
        root_cert_store.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());

        let config = rustls::ClientConfig::builder()
            .with_root_certificates(root_cert_store)
            .with_no_client_auth();

        let tls_connector = TlsConnector::from(Arc::new(config));

        Ok(HttpsConnector { tls_connector })
    }

    /// 执行 HTTPS 请求并记录详细的性能计时
    pub async fn request(
        &self,
        url: &str,
        method: Method,
        headers: Option<HeaderMap<HeaderValue>>,
        body: Option<&str>,
    ) -> Result<
        (
            Response<http_body_util::Full<hyper::body::Bytes>>,
            NetworkTiming,
        ),
        Box<dyn std::error::Error>,
    > {
        let start_time = Instant::now();

        // 解析 URL
        let url = url.parse::<hyper::Uri>()?;
        let host = url.host().ok_or("Invalid host")?.to_string();
        let port = url.port_u16().unwrap_or(443);
        let path = url.path_and_query().map(|x| x.as_str()).unwrap_or("/");

        info!("开始请求: {} {}", method, url);

        // 1. DNS 查询计时
        let dns_start = Instant::now();
        let addr = format!("{}:{}", host.clone(), port);
        // 这里可以用 trust-dns-resolver 或 getaddrinfo 进行真实 DNS 查询计时
        // 但 tokio 的 TcpStream::connect 也会自动解析
        // 这里我们只做简单计时
        let dns_end = Instant::now();
        let dns_lookup = dns_end - dns_start;
        debug!("DNS 查询耗时: {:?}", dns_lookup);

        // 2. TCP 连接计时
        let tcp_start = Instant::now();
        let tcp_stream = TcpStream::connect(&addr).await?;
        let tcp_end = Instant::now();
        let tcp_connect = tcp_end - tcp_start;
        debug!("TCP 连接耗时: {:?}", tcp_connect);

        // 3. TLS 握手计时
        let tls_start = tcp_end;
        let server_name = ServerName::try_from(host.clone())?;
        let tls_stream = self.tls_connector.connect(server_name, tcp_stream).await?;
        let tls_end = Instant::now();
        let tls_handshake = tls_end - tls_start;
        debug!("TLS 握手耗时: {:?}", tls_handshake);

        // 4. 建立 HTTP 连接
        let io = TokioIo::new(tls_stream);
        let (mut sender, conn) = http1::handshake::<_, Full<Bytes>>(io).await?;

        // 在后台处理连接
        tokio::task::spawn(async move {
            if let Err(err) = conn.await {
                error!("连接错误: {:?}", err);
            }
        });

        // 5. 构建请求
        let mut req_builder = Request::builder()
            .method(method)
            .uri(format!("https://{}{}", host.clone(), path))
            .version(Version::HTTP_11);

        // 添加默认头部
        let mut req_headers = HeaderMap::new();
        req_headers.insert(
            USER_AGENT,
            HeaderValue::from_static("hyper-custom-client/1.0"),
        );
        req_headers.insert(CONNECTION, HeaderValue::from_static("close"));

        // 添加自定义头部
        if let Some(custom_headers) = headers {
            for (key, value) in custom_headers {
                if let Some(key) = key {
                    req_headers.insert(key, value);
                }
            }
        }

        // 设置头部
        *req_builder.headers_mut().unwrap() = req_headers;

        // 构建请求体
        let request = if let Some(body_str) = body {
            req_builder.body(Full::new(Bytes::from(body_str.to_string())))?
        } else {
            req_builder.body(Full::new(Bytes::new()))?
        };

        // 6. 请求发送阶段（写入 socket）
        let request_sent_start = Instant::now();
        let send_fut = sender.send_request(request);
        tokio::pin!(send_fut);
        // 7. 等待首字节（TTFB）
        let ttfb_start = Instant::now();
        let response = send_fut.await?;
        let ttfb_end = Instant::now();
        let request_sent = ttfb_start - request_sent_start;
        let waiting_ttfb = ttfb_end - ttfb_start;
        debug!("请求发送耗时: {:?}", request_sent);
        debug!("等待首字节(TTFB)耗时: {:?}", waiting_ttfb);

        // 8. 响应体下载
        let content_download_start = Instant::now();
        let (parts, body) = response.into_parts();
        let body_bytes = body.collect().await?.to_bytes();
        let content_download = content_download_start.elapsed();
        debug!("响应体下载耗时: {:?}", content_download);

        let total_time = start_time.elapsed();

        let timing = NetworkTiming {
            dns_lookup,
            tcp_connect,
            tls_handshake,
            request_sent,
            waiting_ttfb,
            content_download,
            total_time,
        };

        info!("请求完成，总耗时: {:?}", total_time);
        self.log_timing_details(&timing);

        // 重新组装 response，body 用 body_bytes
        let response = hyper::Response::from_parts(parts, Full::new(body_bytes));
        Ok((response, timing))
    }

    /// 记录详细的性能计时信息，类似浏览器开发者工具
    fn log_timing_details(&self, timing: &NetworkTiming) {
        let timing_json = json!({
            "timing": {
                "dns_lookup_ms": timing.dns_lookup.as_millis(),
                "tcp_connect_ms": timing.tcp_connect.as_millis(),
                "tls_handshake_ms": timing.tls_handshake.as_millis(),
                "request_sent_ms": timing.request_sent.as_millis(),
                "waiting_ttfb_ms": timing.waiting_ttfb.as_millis(),
                "content_download_ms": timing.content_download.as_millis(),
                "total_time_ms": timing.total_time.as_millis(),
            },
            "waterfall": {
                "dns": format!("{}ms", timing.dns_lookup.as_millis()),
                "tcp": format!("{}ms", timing.tcp_connect.as_millis()),
                "tls": format!("{}ms", timing.tls_handshake.as_millis()),
                "request_sent": format!("{}ms", timing.request_sent.as_millis()),
                "waiting_ttfb": format!("{}ms", timing.waiting_ttfb.as_millis()),
                "content_download": format!("{}ms", timing.content_download.as_millis()),
                "total": format!("{}ms", timing.total_time.as_millis()),
            }
        });

        info!(
            "性能计时详情: {}",
            serde_json::to_string_pretty(&timing_json).unwrap()
        );
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化日志
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(EnvFilter::from_default_env().add_directive("hyper_client_example=trace".parse()?))
        .init();

    // 创建 HTTPS 连接器
    let connector = HttpsConnector::new()?;

    // 示例 1: GET 请求
    info!("=== 执行 GET 请求 ===");
    let (response, _timing) = connector
        .request("https://httpbin.org/get", Method::GET, None, None)
        .await?;

    info!("响应状态: {}", response.status());
    info!("响应头: {:?}", response.headers());

    // 读取响应体
    let body_bytes = response.into_body().collect().await?.to_bytes();
    let body_str = String::from_utf8_lossy(&body_bytes);
    info!("响应体: {}", body_str);

    // 示例 2: POST 请求
    info!("\n=== 执行 POST 请求 ===");
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

    let post_body = json!({
        "name": "测试用户",
        "message": "这是一个测试消息"
    })
    .to_string();

    let (response, _timing) = connector
        .request(
            "https://httpbin.org/post",
            Method::POST,
            Some(headers),
            Some(&post_body),
        )
        .await?;

    info!("POST 响应状态: {}", response.status());

    let body_bytes = response.into_body().collect().await?.to_bytes();
    let body_str = String::from_utf8_lossy(&body_bytes);
    info!("POST 响应体: {}", body_str);

    // 示例 3: 多个请求的性能比较
    info!("\n=== 性能比较测试 ===");
    let test_urls = vec![
        "https://httpbin.org/delay/1",
        "https://httpbin.org/delay/2",
        "https://httpbin.org/status/200",
    ];

    for url in test_urls {
        info!("测试 URL: {}", url);
        let (response, timing) = connector.request(url, Method::GET, None, None).await?;

        info!(
            "状态: {}, 总耗时: {:?}",
            response.status(),
            timing.total_time
        );

        // 消费响应体以完成请求
        let _ = response.into_body().collect().await?.to_bytes();
    }

    Ok(())
}

// 额外的工具函数
impl NetworkTiming {
    /// 生成类似浏览器开发者工具的瀑布图数据
    pub fn to_waterfall_data(&self) -> serde_json::Value {
        let mut timeline = Vec::new();
        let mut current_time = 0u64;

        // DNS 查询
        if !self.dns_lookup.is_zero() {
            timeline.push(json!({
                "name": "DNS Lookup",
                "start": current_time,
                "duration": self.dns_lookup.as_millis(),
                "color": "#4CAF50"
            }));
            current_time += self.dns_lookup.as_millis() as u64;
        }

        // TCP 连接
        timeline.push(json!({
            "name": "TCP Connect",
            "start": current_time,
            "duration": self.tcp_connect.as_millis(),
            "color": "#2196F3"
        }));
        current_time += self.tcp_connect.as_millis() as u64;

        // TLS 握手
        timeline.push(json!({
            "name": "TLS Handshake",
            "start": current_time,
            "duration": self.tls_handshake.as_millis(),
            "color": "#FF9800"
        }));
        current_time += self.tls_handshake.as_millis() as u64;

        // 请求发送
        timeline.push(json!({
            "name": "Request Sent",
            "start": current_time,
            "duration": self.request_sent.as_millis(),
            "color": "#9C27B0"
        }));
        current_time += self.request_sent.as_millis() as u64;

        // 等待首字节（TTFB）
        timeline.push(json!({
            "name": "Waiting (TTFB)",
            "start": current_time,
            "duration": self.waiting_ttfb.as_millis(),
            "color": "#F44336"
        }));
        current_time += self.waiting_ttfb.as_millis() as u64;

        // 响应体下载
        timeline.push(json!({
            "name": "Content Download",
            "start": current_time,
            "duration": self.content_download.as_millis(),
            "color": "#00BCD4"
        }));
        current_time += self.content_download.as_millis() as u64;

        json!({
            "timeline": timeline,
            "total_duration": self.total_time.as_millis(),
            "summary": {
                "dns": format!("{:.2}ms", self.dns_lookup.as_secs_f64() * 1000.0),
                "tcp": format!("{:.2}ms", self.tcp_connect.as_secs_f64() * 1000.0),
                "tls": format!("{:.2}ms", self.tls_handshake.as_secs_f64() * 1000.0),
                "request_sent": format!("{:.2}ms", self.request_sent.as_secs_f64() * 1000.0),
                "waiting_ttfb": format!("{:.2}ms", self.waiting_ttfb.as_secs_f64() * 1000.0),
                "content_download": format!("{:.2}ms", self.content_download.as_secs_f64() * 1000.0),
                "total": format!("{:.2}ms", self.total_time.as_secs_f64() * 1000.0)
            }
        })
    }
}
