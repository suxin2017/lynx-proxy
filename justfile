test:
    cd crates/lynx-core 
    cargo test  -- --test-threads 1 --nocapture  

lint: 
    cargo clippy --all-targets --all-features -- -D warnings

fix:
    cargo fix --allow-dirty

dev-ui:
    cd ui && pnpm dev

build-ui:
    cd ui && pnpm build
    cp -r ui/dist/ crates/lynx-core/ui_assert

build-server:
    cargo build --release
    
build: build-ui build-server

start-test-server:
    cd crates/lynx-core && cargo test --package lynx-core --test start_test_server --features test -- start_test_server --exact --nocapture --ignored