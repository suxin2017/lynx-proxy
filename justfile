setup-database:
    sea-orm-cli migrate refresh

test:
    cd crates/proxy 
    cargo test  -- --test-threads 1 --nocapture  

lint: 
    cargo clippy --all-targets --all-features -- -D warnings

fix:
    cargo fix --allow-dirty

dev-ui:
    cd ui && pnpm dev

build-ui:
    cd ui && pnpm build
    cp -r ui/dist/ crates/proxy/ui_assert

build-server:
    cargo build --release
    
build: build-ui build-server

start-test-server:
    cd crates/proxy && cargo test --package proxy-server --test start_test_server --features test -- start_test_server --exact --nocapture --ignored