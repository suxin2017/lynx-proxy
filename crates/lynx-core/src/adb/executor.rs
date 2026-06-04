use std::path::{Path, PathBuf};
use std::process::Output;
use std::time::Duration;

use anyhow::{Context, Result, anyhow};
use tokio::process::Command;
use tokio::time::timeout;

const ADB_TIMEOUT: Duration = Duration::from_secs(30);

pub async fn run_adb(adb_path: &Path, serial: Option<&str>, args: &[&str]) -> Result<Output> {
    let mut cmd = Command::new(adb_path);
    if let Some(serial) = serial {
        cmd.arg("-s").arg(serial);
    }
    cmd.args(args);
    let future = cmd.output();
    let output = timeout(ADB_TIMEOUT, future)
        .await
        .context("adb command timed out")?
        .context("failed to spawn adb")?;
    Ok(output)
}

pub fn adb_output_message(output: &Output) -> String {
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = stdout.trim();
    let stderr = stderr.trim();
    match (stdout.is_empty(), stderr.is_empty()) {
        (false, false) => format!("{stdout}\n{stderr}"),
        (false, true) => stdout.to_string(),
        (true, false) => stderr.to_string(),
        (true, true) => String::new(),
    }
}

pub fn ensure_success(output: &Output, action: &str) -> Result<()> {
    if output.status.success() {
        return Ok(());
    }
    Err(anyhow!(
        "{action} failed (exit {:?}): {}",
        output.status.code(),
        adb_output_message(output)
    ))
}

pub async fn adb_version(adb_path: &Path) -> Result<String> {
    let output = run_adb(adb_path, None, &["version"]).await?;
    ensure_success(&output, "adb version")?;
    let text = adb_output_message(&output);
    Ok(text.lines().next().unwrap_or("unknown").trim().to_string())
}

pub fn bundled_adb_path(platform_tools_dir: &Path) -> PathBuf {
    #[cfg(windows)]
    {
        platform_tools_dir.join("adb.exe")
    }
    #[cfg(not(windows))]
    {
        platform_tools_dir.join("adb")
    }
}

pub async fn resolve_path_adb() -> Option<PathBuf> {
    let output = Command::new("adb")
        .arg("version")
        .output()
        .await
        .ok()?;
    if output.status.success() {
        Some(PathBuf::from("adb"))
    } else {
        None
    }
}
