use anyhow::{Result, anyhow};
use console::style;
use directories::ProjectDirs;
use std::fs;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread::sleep;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tracing::{error, info, warn};

use crate::LogLevel;
use crate::daemon::status::{DaemonStatus, ProcessStatus};

pub struct DaemonManager {
    data_dir: PathBuf,
    status_file: PathBuf,
    pid_file: PathBuf,
}

impl DaemonManager {
    pub fn new(data_dir: Option<PathBuf>) -> Result<Self> {
        let data_dir = if let Some(data_dir) = data_dir {
            data_dir
        } else {
            let project = ProjectDirs::from("cc", "xin2017338", "lynx")
                .ok_or_else(|| anyhow!("Failed to get project dir"))?;
            project.data_dir().to_path_buf()
        };

        if !data_dir.exists() {
            fs::create_dir_all(&data_dir)?;
        }

        let daemon_dir = data_dir.join("daemon");
        if !daemon_dir.exists() {
            fs::create_dir_all(&daemon_dir)?;
        }

        Ok(Self {
            data_dir: data_dir.clone(),
            status_file: daemon_dir.join("status.json"),
            pid_file: daemon_dir.join("daemon.pid"),
        })
    }

    pub async fn start_daemon(
        &self,
        port: u16,
        data_dir: Option<String>,
        log_level: LogLevel,
        local_only: bool,
        auth_user: Option<String>,
        auth_pass: Option<String>,
    ) -> Result<()> {
        // Check if daemon is already running
        if let Ok(status) = self.get_status() {
            if self.is_process_running(status.pid) {
                let port_info = if status.port != port {
                    format!(" (requested port {}, actual port {})", port, status.port)
                } else {
                    String::new()
                };
                let auth_info = status.auth_user.map_or_else(
                    || "disabled".to_string(),
                    |u| format!("enabled (user: {})", u),
                );
                println!(
                    "{}",
                    style("Lynx proxy service is already running").yellow()
                );
                println!("  PID: {}", style(status.pid).cyan());
                println!("  Port: {}", style(status.port).cyan());
                println!("  Auth: {}", style(auth_info).cyan());
                println!("  Data: {}", style(status.data_dir.display()).cyan());
                if !port_info.is_empty() {
                    println!("  {}", style(port_info).yellow());
                }
                return Ok(());
            }

            // Stale status file — process is no longer running
            if status.is_running() {
                println!(
                    "{}",
                    style("Found stale status file (process no longer running), starting fresh...")
                        .yellow()
                );
            }
        }

        let data_dir = if let Some(data_dir) = data_dir {
            PathBuf::from(data_dir)
        } else {
            self.data_dir.clone()
        };

        // Start the daemon process
        let status = self
            .spawn_daemon_process(
                port,
                data_dir.clone(),
                log_level,
                local_only,
                auth_user,
                auth_pass,
            )
            .await?;

        // Save status
        self.save_status(&status)?;

        // Save PID
        fs::write(&self.pid_file, status.pid.to_string())?;

        println!("{}", style(format!("PID: {}", status.pid)).green());
        println!(
            "{}",
            style(format!("Data directory: {}", data_dir.display())).cyan()
        );

        Ok(())
    }

    pub fn stop_daemon(&self) -> Result<()> {
        let status = self
            .get_status()
            .map_err(|_| anyhow!("No Lynx proxy service status found. Is the service running?"))?;

        if !status.is_running() {
            println!("{}", style("Lynx proxy service is not running").yellow());
            return Ok(());
        }

        // Try to kill the process
        if self.kill_process(status.pid)? {
            // Update status
            let mut status = status;
            status.set_stopped();
            self.save_status(&status)?;

            // Remove PID file
            if self.pid_file.exists() {
                fs::remove_file(&self.pid_file)?;
            }

            println!(
                "{}",
                style("Lynx proxy service stopped successfully").green()
            );
        } else {
            return Err(anyhow!("Failed to stop daemon process"));
        }

        Ok(())
    }

    /// Resolve restart parameters by merging CLI-provided values with saved status.
    /// CLI values take precedence; if not provided, saved values are used.
    fn resolve_restart_params(
        cli_port: Option<u16>,
        cli_data_dir: Option<String>,
        cli_log_level: Option<LogLevel>,
        cli_local_only: Option<bool>,
        cli_auth_user: Option<String>,
        cli_auth_pass: Option<String>,
        saved: &DaemonStatus,
    ) -> (u16, String, LogLevel, bool, Option<String>, Option<String>) {
        let port = cli_port.unwrap_or(saved.port);
        let data_dir = cli_data_dir.unwrap_or_else(|| saved.data_dir.to_string_lossy().to_string());
        let log_level = cli_log_level.unwrap_or(saved.log_level);
        let local_only = cli_local_only.unwrap_or(saved.local_only);
        let auth_user = cli_auth_user.or_else(|| saved.auth_user.clone());
        let auth_pass = cli_auth_pass.or_else(|| saved.auth_pass.clone());

        (port, data_dir, log_level, local_only, auth_user, auth_pass)
    }

    pub async fn restart_daemon(
        &self,
        port: Option<u16>,
        data_dir: Option<String>,
        log_level: Option<LogLevel>,
        local_only: Option<bool>,
        auth_user: Option<String>,
        auth_pass: Option<String>,
    ) -> Result<()> {
        println!("{}", style("Restarting Lynx proxy service...").cyan());

        // Get current configuration
        let current_status = self.get_status().map_err(|_| {
            anyhow!("No Lynx proxy service status found. Use 'daemon start' instead.")
        })?;

        // Use provided values or fall back to saved status
        let (port, data_dir, log_level, local_only, auth_user, auth_pass) =
            Self::resolve_restart_params(
                port,
                data_dir,
                log_level,
                local_only,
                auth_user,
                auth_pass,
                &current_status,
            );

        // Stop the daemon
        if let Err(e) = self.stop_daemon() {
            warn!("Error stopping daemon: {}", e);
        }

        // Wait a bit for cleanup
        std::thread::sleep(std::time::Duration::from_millis(500));

        // Start the daemon again
        self.start_daemon(
            port,
            Some(data_dir),
            log_level,
            local_only,
            auth_user,
            auth_pass,
        )
        .await?;

        println!(
            "{}",
            style("Lynx proxy service restarted successfully").green()
        );
        Ok(())
    }

    pub fn is_daemon_running(&self) -> bool {
        match self.get_status() {
            Ok(status) => self.is_process_running(status.pid),
            Err(_) => false,
        }
    }

    pub fn show_status(&self) -> Result<()> {
        match self.get_status() {
            Ok(status) => {
                println!("{}", style("=== Lynx Proxy Service Status ===").bold());
                if status.is_running() {
                    println!("PID: {}", style(status.pid).cyan());
                }
                println!("Port: {}", style(status.port).cyan());
                println!("Status: {}", self.format_status(&status));
                println!(
                    "Data Directory: {}",
                    style(status.data_dir.display()).cyan()
                );

                if let Some(ref auth_user) = status.auth_user {
                    println!(
                        "Auth: {} (enabled, user: {})",
                        style("enabled").green(),
                        style(auth_user).cyan(),
                    );
                } else {
                    println!("Auth: {}", style("disabled").yellow());
                }

                if status.is_running()
                    && let Ok(_start_time) = status.start_time.duration_since(std::time::UNIX_EPOCH)
                {
                    let formatted_time = self.format_start_time(&status.start_time);
                    println!("Running: {}", style(formatted_time).cyan());
                }

                // Check if process is actually running
                let is_running = self.is_process_running(status.pid);
                println!(
                    "Process Running: {}",
                    if is_running {
                        style("Yes").green()
                    } else {
                        style("No").red()
                    }
                );
            }
            Err(_) => {
                println!(
                    "{}",
                    style("No Lynx proxy service is currently running").yellow()
                );
            }
        }
        Ok(())
    }

    fn get_status(&self) -> Result<DaemonStatus> {
        let content =
            fs::read_to_string(&self.status_file).map_err(|_| anyhow!("Status file not found"))?;

        serde_json::from_str(&content).map_err(|e| anyhow!("Failed to parse status file: {}", e))
    }

    fn save_status(&self, status: &DaemonStatus) -> Result<()> {
        let content = serde_json::to_string_pretty(status)?;
        fs::write(&self.status_file, content)?;
        Ok(())
    }

    fn is_process_running(&self, pid: u32) -> bool {
        #[cfg(unix)]
        {
            use std::process::Command;
            Command::new("kill")
                .arg("-0")
                .arg(pid.to_string())
                .output()
                .map(|output| output.status.success())
                .unwrap_or(false)
        }

        #[cfg(windows)]
        {
            use std::process::Command;
            Command::new("tasklist")
                .arg("/FI")
                .arg(format!("PID eq {}", pid))
                .output()
                .map(|output| String::from_utf8_lossy(&output.stdout).contains(&pid.to_string()))
                .unwrap_or(false)
        }
    }

    fn kill_process(&self, pid: u32) -> Result<bool> {
        #[cfg(unix)]
        {
            use std::process::Command;

            // 在 Unix 系统上使用 kill 命令终止进程
            let output = Command::new("kill")
                .arg("-TERM") // 发送 SIGTERM 信号
                .arg(pid.to_string())
                .output();

            match output {
                Ok(output) => {
                    if output.status.success() {
                        info!("Lynx proxy service process {} terminated successfully", pid);
                        Ok(true)
                    } else {
                        let stderr = String::from_utf8_lossy(&output.stderr);
                        error!(
                            "Failed to terminate Lynx proxy service process {}: {}",
                            pid, stderr
                        );
                        Ok(false)
                    }
                }
                Err(e) => {
                    error!(
                        "Failed to execute kill command for Lynx proxy service process {}: {}",
                        pid, e
                    );
                    Ok(false)
                }
            }
        }

        #[cfg(windows)]
        {
            use std::process::Command;

            // 在 Windows 上使用 taskkill 命令终止进程
            let output = Command::new("taskkill")
                .arg("/F") // 强制终止
                .arg("/PID")
                .arg(pid.to_string())
                .output();

            match output {
                Ok(output) => {
                    if output.status.success() {
                        info!("Lynx proxy service process {} terminated successfully", pid);
                        Ok(true)
                    } else {
                        let stderr = String::from_utf8_lossy(&output.stderr);
                        error!(
                            "Failed to terminate Lynx proxy service process {}: {}",
                            pid, stderr
                        );
                        Ok(false)
                    }
                }
                Err(e) => {
                    error!(
                        "Failed to execute taskkill command for Lynx proxy service process {}: {}",
                        pid, e
                    );
                    Ok(false)
                }
            }
        }
    }

    fn format_status(&self, status: &DaemonStatus) -> console::StyledObject<&str> {
        match &status.status {
            ProcessStatus::Running => style("Running").green(),
            ProcessStatus::Stopped => style("Stopped").red(),
            ProcessStatus::Error(_) => style("Error").red(),
        }
    }

    /// Format start time for human-readable display
    fn format_start_time(&self, start_time: &SystemTime) -> String {
        match start_time.duration_since(UNIX_EPOCH) {
            Ok(duration) => {
                let secs = duration.as_secs();

                // Calculate uptime by comparing with current time
                if let Ok(now) = SystemTime::now().duration_since(UNIX_EPOCH) {
                    let now_secs = now.as_secs();

                    // Handle edge case where start_time is in the future
                    if secs > now_secs {
                        return "Invalid start time".to_string();
                    }

                    let uptime_secs = now_secs - secs;
                    let uptime_days = uptime_secs / 86400;
                    let uptime_hours = (uptime_secs % 86400) / 3600;
                    let uptime_minutes = (uptime_secs % 3600) / 60;
                    let uptime_seconds = uptime_secs % 60;

                    let mut parts = Vec::new();

                    if uptime_days > 0 {
                        let unit = if uptime_days == 1 { "day" } else { "days" };
                        parts.push(format!("{} {}", uptime_days, unit));
                    }
                    if uptime_hours > 0 {
                        let unit = if uptime_hours == 1 { "hour" } else { "hours" };
                        parts.push(format!("{} {}", uptime_hours, unit));
                    }
                    if uptime_minutes > 0 {
                        let unit = if uptime_minutes == 1 {
                            "minute"
                        } else {
                            "minutes"
                        };
                        parts.push(format!("{} {}", uptime_minutes, unit));
                    }
                    if uptime_seconds > 0 || parts.is_empty() {
                        let unit = if uptime_seconds == 1 {
                            "second"
                        } else {
                            "seconds"
                        };
                        parts.push(format!("{} {}", uptime_seconds, unit));
                    }

                    format!("{} ago", parts.join(" "))
                } else {
                    format!("{} seconds since epoch", secs)
                }
            }
            Err(_) => "Unknown".to_string(),
        }
    }

    /// 配置平台特定的守护进程选项
    fn configure_daemon_process(command: &mut Command) -> Result<()> {
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;

            // Unix 系统 (Linux, macOS) 的进程分离配置
            // 1. 创建新的进程组，使子进程与父进程分离
            command.process_group(0);

            info!("Configured Unix daemon process options");
        }

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;

            // Windows 系统的进程分离配置
            // CREATE_NEW_PROCESS_GROUP: 创建新的进程组
            // DETACHED_PROCESS: 分离进程，不继承父进程的控制台
            const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
            const DETACHED_PROCESS: u32 = 0x00000008;

            command.creation_flags(CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS);

            info!("Configured Windows daemon process options");
        }

        Ok(())
    }

    /// 启动守护进程
    async fn spawn_daemon_process(
        &self,
        port: u16,
        data_dir: PathBuf,
        log_level: LogLevel,
        local_only: bool,
        auth_user: Option<String>,
        auth_pass: Option<String>,
    ) -> Result<DaemonStatus> {
        let current_exe = std::env::current_exe()?;
        let mut command = Command::new(&current_exe);
        command
            .arg("run")
            .arg("--daemon")
            .arg("--port")
            .arg(port.to_string())
            .arg("--data-dir")
            .arg(data_dir.to_string_lossy().to_string())
            .arg("--log-level")
            .arg(log_level.to_string());

        if let Some(ref user) = auth_user {
            command.arg("--user").arg(user);
        }
        if let Some(ref pass) = auth_pass {
            command.arg("--pass").arg(pass);
        }

        if local_only {
            command.arg("--local-only");
        }

        command
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .stdin(Stdio::null());

        Self::configure_daemon_process(&mut command)?;

        let child = command.spawn()?;
        let pid = child.id();

        let mut status = DaemonStatus::new(
            pid, port, data_dir, log_level, local_only, auth_user, auth_pass,
        );

        std::mem::forget(child);

        let socket_addrs = self.wait_for_connection_info(port).await?;

        let connection_urls = socket_addrs
            .iter()
            .map(|addr| format!("http://{}", addr))
            .collect::<Vec<String>>();

        let connect_urls_str = connection_urls.join("\n");
        let ui_addr = connection_urls.first().cloned();
        status.set_connection_url(connection_urls);

        println!("{}", style("Lynx Proxy Started").green());
        println!(
            "Available on:\n {}",
            style(connect_urls_str.to_string()).cyan()
        );
        println!(
            "Web UI is available on: {}",
            style(ui_addr.unwrap_or_default()).cyan()
        );
        Ok(status)
    }

    async fn wait_for_connection_info(&self, port: u16) -> Result<Vec<String>> {
        sleep(Duration::from_millis(500));
        let res = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()?
            .get(format!("http://127.0.0.1:{port}/api/base_info/address"))
            .send()
            .await?;

        let res = res.json::<Vec<String>>().await?;

        Ok(res)
    }
}

#[test]
fn test_log() {
    println!("{}", style("Lynx Proxy Started").green());
    // 打印版本信息
    println!(
        "Version: {}",
        style(env!("CARGO_PKG_VERSION")).bold().green()
    );
    // 打印服務訪問地址
    println!("Proxy server :\n {}", style("http://127.0.0.1:300").cyan());
    println!(
        "Web UI is available on: {}",
        style("http://127.0.0.1:7788").cyan()
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, SystemTime};

    fn create_test_manager() -> DaemonManager {
        DaemonManager::new(Some(PathBuf::from("/tmp/test_lynx"))).unwrap()
    }

    fn test_status() -> DaemonStatus {
        DaemonStatus::new(
            12345,
            7788,
            PathBuf::from("/tmp/test_lynx"),
            LogLevel::Info,
            false,
            Some("admin".to_string()),
            Some("pass123".to_string()),
        )
    }

    // --- resolve_restart_params tests ---

    #[test]
    fn test_restart_params_all_provided() {
        let saved = test_status();
        let (port, data_dir, log_level, local_only, auth_user, auth_pass) =
            DaemonManager::resolve_restart_params(
                Some(9090),
                Some("/new/data".to_string()),
                Some(LogLevel::Debug),
                Some(true),
                Some("new_user".to_string()),
                Some("new_pass".to_string()),
                &saved,
            );

        assert_eq!(port, 9090);
        assert_eq!(data_dir, "/new/data");
        assert_eq!(log_level, LogLevel::Debug);
        assert!(local_only);
        assert_eq!(auth_user, Some("new_user".to_string()));
        assert_eq!(auth_pass, Some("new_pass".to_string()));
    }

    #[test]
    fn test_restart_params_all_fallback() {
        let saved = test_status();
        let (port, data_dir, log_level, local_only, auth_user, auth_pass) =
            DaemonManager::resolve_restart_params(None, None, None, None, None, None, &saved);

        assert_eq!(port, 7788);
        assert_eq!(data_dir, "/tmp/test_lynx");
        assert_eq!(log_level, LogLevel::Info);
        assert!(!local_only);
        assert_eq!(auth_user, Some("admin".to_string()));
        assert_eq!(auth_pass, Some("pass123".to_string()));
    }

    #[test]
    fn test_restart_params_partial_override() {
        let saved = test_status();
        let (port, data_dir, log_level, local_only, auth_user, auth_pass) =
            DaemonManager::resolve_restart_params(
                Some(9090),
                None,
                None,
                Some(true),
                None,
                None,
                &saved,
            );

        assert_eq!(port, 9090);
        assert_eq!(data_dir, "/tmp/test_lynx");
        assert_eq!(log_level, LogLevel::Info);
        assert!(local_only);
        assert_eq!(auth_user, Some("admin".to_string()));
        assert_eq!(auth_pass, Some("pass123".to_string()));
    }

    #[test]
    fn test_restart_params_override_auth() {
        let saved = test_status();
        let (port, _data_dir, _log_level, _local_only, auth_user, auth_pass) =
            DaemonManager::resolve_restart_params(
                None,
                None,
                None,
                None,
                Some("override_user".to_string()),
                Some("override_pass".to_string()),
                &saved,
            );

        assert_eq!(port, 7788);
        assert_eq!(auth_user, Some("override_user".to_string()));
        assert_eq!(auth_pass, Some("override_pass".to_string()));
    }

    #[test]
    fn test_restart_params_no_auth_in_saved() {
        let mut saved = test_status();
        saved.auth_user = None;
        saved.auth_pass = None;
        let (_, _, _, _, auth_user, auth_pass) =
            DaemonManager::resolve_restart_params(None, None, None, None, None, None, &saved);

        assert_eq!(auth_user, None);
        assert_eq!(auth_pass, None);
    }

    #[test]
    fn test_format_start_time_seconds() {
        let manager = create_test_manager();
        let now = SystemTime::now();
        let start_time = now - Duration::from_secs(30);

        let formatted = manager.format_start_time(&start_time);
        assert_eq!(formatted, "30 seconds ago");
    }

    #[test]
    fn test_format_start_time_single_second() {
        let manager = create_test_manager();
        let now = SystemTime::now();
        let start_time = now - Duration::from_secs(1);

        let formatted = manager.format_start_time(&start_time);
        assert_eq!(formatted, "1 second ago");
    }

    #[test]
    fn test_format_start_time_minutes() {
        let manager = create_test_manager();
        let now = SystemTime::now();
        let start_time = now - Duration::from_secs(150); // 2 minutes 30 seconds

        let formatted = manager.format_start_time(&start_time);
        assert_eq!(formatted, "2 minutes 30 seconds ago");
    }

    #[test]
    fn test_format_start_time_single_minute() {
        let manager = create_test_manager();
        let now = SystemTime::now();
        let start_time = now - Duration::from_secs(90); // 1 minute 30 seconds

        let formatted = manager.format_start_time(&start_time);
        assert_eq!(formatted, "1 minute 30 seconds ago");
    }

    #[test]
    fn test_format_start_time_hours() {
        let manager = create_test_manager();
        let now = SystemTime::now();
        let start_time = now - Duration::from_secs(7290); // 2 hours 1 minute 30 seconds

        let formatted = manager.format_start_time(&start_time);
        assert_eq!(formatted, "2 hours 1 minute 30 seconds ago");
    }

    #[test]
    fn test_format_start_time_single_hour() {
        let manager = create_test_manager();
        let now = SystemTime::now();
        let start_time = now - Duration::from_secs(3661); // 1 hour 1 minute 1 second

        let formatted = manager.format_start_time(&start_time);
        assert_eq!(formatted, "1 hour 1 minute 1 second ago");
    }

    #[test]
    fn test_format_start_time_days() {
        let manager = create_test_manager();
        let now = SystemTime::now();
        let start_time = now - Duration::from_secs(176461); // 2 days 1 hour 1 minute 1 second

        let formatted = manager.format_start_time(&start_time);
        assert_eq!(formatted, "2 days 1 hour 1 minute 1 second ago");
    }

    #[test]
    fn test_format_start_time_single_day() {
        let manager = create_test_manager();
        let now = SystemTime::now();
        let start_time = now - Duration::from_secs(90061); // 1 day 1 hour 1 minute 1 second

        let formatted = manager.format_start_time(&start_time);
        assert_eq!(formatted, "1 day 1 hour 1 minute 1 second ago");
    }

    #[test]
    fn test_format_start_time_only_minutes() {
        let manager = create_test_manager();
        let now = SystemTime::now();
        let start_time = now - Duration::from_secs(300); // 5 minutes exactly

        let formatted = manager.format_start_time(&start_time);
        assert_eq!(formatted, "5 minutes ago");
    }

    #[test]
    fn test_format_start_time_only_hours() {
        let manager = create_test_manager();
        let now = SystemTime::now();
        let start_time = now - Duration::from_secs(7200); // 2 hours exactly

        let formatted = manager.format_start_time(&start_time);
        assert_eq!(formatted, "2 hours ago");
    }

    #[test]
    fn test_format_start_time_just_started() {
        let manager = create_test_manager();
        let now = SystemTime::now();

        let formatted = manager.format_start_time(&now);
        assert!(formatted == "0 seconds ago" || formatted.contains("second"));
    }

    #[test]
    fn test_format_start_time_complex_combination() {
        let manager = create_test_manager();
        let now = SystemTime::now();
        // 3 days, 5 hours, 23 minutes, 45 seconds
        let total_seconds = 3 * 86400 + 5 * 3600 + 23 * 60 + 45;
        let start_time = now - Duration::from_secs(total_seconds);

        let formatted = manager.format_start_time(&start_time);
        assert_eq!(formatted, "3 days 5 hours 23 minutes 45 seconds ago");
    }

    #[test]
    fn test_format_start_time_invalid_time() {
        let manager = create_test_manager();
        // Create a time that's in the future (invalid for start time)
        let future_time = SystemTime::now() + Duration::from_secs(3600);

        let formatted = manager.format_start_time(&future_time);
        assert_eq!(formatted, "Invalid start time");
    }
}
