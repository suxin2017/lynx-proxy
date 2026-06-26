use std::io::{self, Write};

use anyhow::Result;
use console::style;
use semver::Version;
use serde::Deserialize;

const GITHUB_API_URL: &str = "https://api.github.com/repos/xin2017338/lynx-proxy/releases/latest";
const CARGO_PKG_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    #[serde(rename = "tag_name")]
    tag_name: String,
}

/// Check if a newer version is available.
/// Returns `Some(latest_version_string)` if an update exists, `None` otherwise.
/// Errors (network, rate-limit, etc.) are silently ignored.
pub async fn check_for_updates() -> Option<String> {
    match check_for_updates_inner().await {
        Ok(Some(version)) => Some(version),
        _ => None,
    }
}

async fn check_for_updates_inner() -> Result<Option<String>> {
    let current = Version::parse(CARGO_PKG_VERSION)?;

    let client = reqwest::Client::builder()
        .user_agent("lynx-proxy")
        .timeout(std::time::Duration::from_secs(3))
        .build()?;

    let release: GitHubRelease = client
        .get(GITHUB_API_URL)
        .send()
        .await?
        .json()
        .await?;

    let latest_tag = release.tag_name.trim_start_matches('v');
    let latest = Version::parse(latest_tag)?;

    if latest > current {
        Ok(Some(latest_tag.to_string()))
    } else {
        Ok(None)
    }
}

/// Print a non-interactive update banner (used for server commands).
pub fn print_update_banner(latest: &str) {
    println!();
    println!(
        "{}{}",
        style("Update available: ").bold().green(),
        style(format!(
            "v{} (current: v{})",
            latest, CARGO_PKG_VERSION
        ))
        .cyan(),
    );
}

/// Prompt the user to update and perform the install if they agree.
pub fn prompt_and_update(latest: &str) {
    print_update_banner(latest);

    print!(
        "{} ",
        style(format!("Update to v{}? [y/N]: ", latest)).bold()
    );
    let _ = io::stdout().flush();

    let mut input = String::new();
    if io::stdin().read_line(&mut input).is_err() {
        return;
    }

    let answer = input.trim().to_lowercase();
    if answer != "y" && answer != "yes" {
        println!(
            "  {}",
            style("Skipped. You can update manually:").yellow()
        );
        println!(
            "    {}",
            style("https://github.com/xin2017338/lynx-proxy/releases/latest")
                .underlined()
                .cyan()
        );
        return;
    }

    println!("  {} v{} ...", style("Installing").cyan(), latest);
    match perform_update() {
        Ok(()) => {
            println!("  {} Updated to v{}!", style("Done").bold().green(), latest);
        }
        Err(e) => {
            eprintln!(
                "  {} Failed to update: {}",
                style("Error").bold().red(),
                e
            );
        }
    }
}

/// Return the (command, args) to run for updating.
/// Uses the cargo-dist-generated `lynx-cli-update` binary if on PATH.
fn update_command() -> (String, Vec<String>) {
    for candidate in ["lynx-cli-update", "lynx-update"] {
        if is_executable_on_path(candidate) {
            return (candidate.to_string(), vec![]);
        }
    }

    // No updater binary found
    (String::new(), vec![])
}

fn perform_update() -> Result<()> {
    let (cmd, args) = update_command();

    if cmd.is_empty() {
        anyhow::bail!(
            "updater not found on PATH.\n  \
             Please download the latest release from:\n  \
             {}",
            style("https://github.com/xin2017338/lynx-proxy/releases/latest")
                .underlined()
                .cyan(),
        );
    }

    let mut child = std::process::Command::new(&cmd);
    child
        .args(&args)
        .stdout(std::process::Stdio::inherit())
        .stderr(std::process::Stdio::inherit());

    let status = child.status()?;

    if !status.success() {
        anyhow::bail!("{} exited with status: {}", cmd, status);
    }
    Ok(())
}

/// Check whether an executable exists on the system PATH (cross-platform).
fn is_executable_on_path(name: &str) -> bool {
    let check_cmd = if cfg!(windows) { "where" } else { "which" };

    std::process::Command::new(check_cmd)
        .arg(name)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}
