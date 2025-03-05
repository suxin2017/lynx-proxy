pub use sea_orm_migration::prelude::*;

mod app_config;
mod request;
mod response;
mod rule;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(app_config::Migration),
            Box::new(rule::Migration),
            Box::new(request::Migration),
            Box::new(response::Migration),
        ]
    }
}
