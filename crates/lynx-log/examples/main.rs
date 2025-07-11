use std::{
    convert::Infallible,
    future::Future,
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use anyhow::Result;

use lynx_log_jaeger::init_jaeger_tracer;

use tokio::spawn;
use tower::{Layer, Service, ServiceBuilder, service_fn, util::Oneshot};
use tracing::{Instrument, Span, info, instrument};

// Layer A - 打印 "a"
#[derive(Clone)]
pub struct LayerA;

impl<S> Layer<S> for LayerA {
    type Service = ServiceA<S>;

    fn layer(&self, inner: S) -> Self::Service {
        ServiceA { inner }
    }
}

#[derive(Clone)]
pub struct ServiceA<S> {
    inner: S,
}

impl<S, Request> Service<Request> for ServiceA<S>
where
    S: Service<Request>,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    #[instrument(skip(self, request), name = "LayerA")]
    fn call(&mut self, request: Request) -> Self::Future {
        println!("Layer A: a");
        info!("Layer A processing request");
        let future = self.inner.call(request);
        Box::pin(async move { future.await })
    }
}

// Layer B - 打印 "b"
#[derive(Clone)]
pub struct LayerB;

impl<S> Layer<S> for LayerB {
    type Service = ServiceB<S>;

    fn layer(&self, inner: S) -> Self::Service {
        ServiceB { inner }
    }
}

#[derive(Clone)]
pub struct ServiceB<S> {
    inner: S,
}

impl<S, Request> Service<Request> for ServiceB<S>
where
    S: Service<Request>,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    #[instrument(skip(self, request), name = "LayerB::call")]
    fn call(&mut self, request: Request) -> Self::Future {
        println!("Layer B: b");
        info!("Layer B processing request");
        let future = self.inner.call(request);
        Box::pin(async move { future.await })
    }
}

// 计算 1+1 的异步函数
#[instrument]
async fn calculate_add(input: i32) -> Result<i32, Infallible> {
    println!("Calculating: {} + 1", input);
    info!("Starting calculation for input: {}", input);
    let result = input + 1;
    info!("Calculation completed, result: {}", result);
    Ok(result)
}

#[tokio::main]
#[instrument]
async fn main() -> Result<()> {
    let _handler = init_jaeger_tracer()?;

    info!("start");

    // 创建计算服务
    let calc_service = service_fn(calculate_add);

    // 使用 ServiceBuilder 构建带有两个 layer 的服务
    let service = ServiceBuilder::new()
        .layer(LayerA)
        .layer(LayerB)
        .service(calc_service);

    // 使用 Oneshot 调用服务
    let response = Oneshot::new(service, 1).await;

    match response {
        Ok(result) => {
            println!("Result: {}", result);
            info!("Calculation completed successfully: {}", result);
        }
        Err(e) => {
            println!("Error: {:?}", e);
        }
    }

    async_call().await?;
    // 等待一段时间让 traces 上报完成
    info!("Waiting for traces to be exported...");
    tokio::time::sleep(Duration::from_secs(10)).await;
    info!("Program ending");

    Ok(())
}

#[instrument(skip_all)]
pub async fn async_call_future() -> Result<()> {
    // 创建计算服务
    let calc_service = service_fn(calculate_add);

    // 使用 ServiceBuilder 构建带有两个 layer 的服务
    let service = ServiceBuilder::new()
        .layer(LayerA)
        .layer(LayerB)
        .service(calc_service);

    // 创建 transform_svc，类似于原始代码中的写法
    let transform_svc = service_fn(move |req: i32| {
        let svc = service.clone();
        async move {
            // 这里模拟了原始代码中的请求转换逻辑
            info!("Transform service processing request: {}", req);
            Oneshot::new(svc, req).await
        }
    });

    // 使用 transform_svc 调用服务
    let response = Oneshot::new(transform_svc, 1).await;

    match response {
        Ok(result) => {
            println!("Result: {}", result);
            info!("Calculation completed successfully: {}", result);
        }
        Err(e) => {
            println!("Error: {:?}", e);
        }
    }

    Ok(())
}

#[instrument(skip_all)]
pub async fn async_call() -> Result<()> {
    spawn(
        async move {
            let response = async_call_future().await;

            match response {
                Ok(_) => {
                    info!("Calculation completed successfully");
                }
                Err(e) => {
                    println!("Error: {:?}", e);
                }
            }
        }
        .instrument(Span::current()),
    );

    Ok(())
}
