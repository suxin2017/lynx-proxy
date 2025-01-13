use sea_orm_migration::{prelude::*, Migration};
use migration::{Migrator, MigratorTrait};

#[async_std::main]
async fn main() {
    tracing_subscriber::fmt()
    .with_max_level(tracing::Level::INFO)
    .with_test_writer()
    .init();
   let db = sea_orm::Database::connect("sqlite://db.sqlite?mode=rwc").await.unwrap();
    // assert that the database generated the schema
    // let schema_manager = SchemaManager::new(&db);

    Migrator::refresh(&db).await.unwrap();
}
