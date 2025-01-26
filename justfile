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
