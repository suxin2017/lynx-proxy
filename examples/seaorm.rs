use dotenv::dotenv;
use proxy_rust::entity::{rule, rule_group};
use sea_orm::{ ActiveModelTrait, Database, EntityTrait, ModelTrait, Related, Set};
use std::env;
use std::path::PathBuf;
use proxy_rust::entity::prelude::*;



#[tokio::main]
async fn main() {
    dotenv().ok();

    for (key, value) in env::vars() {
        println!("{}: {}", key, value);
    }
    tracing_subscriber::fmt()
    .with_max_level(tracing::Level::DEBUG)
    .with_test_writer()
    .init();

    // Your async code here
    let db = Database::connect(format!("sqlite://db.sqlite?mode=rwc")).await.unwrap();
    let rule_group =  rule_group::ActiveModel{
        name: Set("Pear".to_owned()),
        ..Default::default()
    };
    RuleGroup::insert(rule_group).exec(&db).await.unwrap();
    let target_group = RuleGroup::find().one(&db).await.unwrap().unwrap();

    let rule = rule::ActiveModel{
        r#match: Set("Pear".to_owned()),
        target_uri: Set("Pear".to_owned()),
        rule_group_id: Set(target_group.id),
        ..Default::default()
    };
    Rule::insert(rule).exec(&db).await.unwrap();

   let rules =  target_group.find_related(Rule).all(&db).await.unwrap();
    for rule in rules{
         println!("{:?}", rule);
    }

   
    db.close().await;
    println!("Connected to the database");

    
}