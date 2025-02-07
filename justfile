test:
    cd crates/lynx-core 
    cargo test  -- --test-threads 1 --nocapture  

lint: 
    cargo clippy --all-targets --all-features -- -D warnings

fix:
    cargo fix --allow-dirty

setup-ui:
    cd crates/lynx-proxy && pnpm install

dev-ui:
    cd crates/lynx-proxy && pnpm dev

dev-mock-ui:
    cd crates/lynx-proxy && pnpm dev:mock

build-ui:
    cd crates/lynx-proxy && pnpm build
    rm -rf crates/lynx-cli/asserts
    cp -r crates/lynx-proxy/dist/ crates/lynx-cli/asserts

build-server:
    cargo build --release
    
build: build-ui build-server

start-test-server:
    cd crates/lynx-core && cargo test --package lynx-core --test start_test_server --features test -- start_test_server --exact --nocapture --ignored