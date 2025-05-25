pub use sea_orm_migration::prelude::*;

pub mod app_config;
pub mod request_processing;
pub mod complex_capture_rules;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(app_config::Migration),
            Box::new(request_processing::Migration),
            Box::new(complex_capture_rules::Migration),
        ]
    }
}
