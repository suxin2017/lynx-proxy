//! CLI tests for `lynx cert` subcommands.

use std::process::Command;

use anyhow::Result;

fn lynx_bin() -> Command {
    Command::new(env!("CARGO_BIN_EXE_lynx"))
}

#[test]
fn cert_help_lists_subcommands() -> Result<()> {
    let output = lynx_bin().args(["cert", "--help"]).output()?;
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("install"));
    assert!(stdout.contains("uninstall"));
    assert!(stdout.contains("status"));
    Ok(())
}

#[test]
fn cert_install_help_mentions_data_dir() -> Result<()> {
    let output = lynx_bin().args(["cert", "install", "--help"]).output()?;
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("data-dir"));
    Ok(())
}
