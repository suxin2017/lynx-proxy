use anyhow::{Result, anyhow};
use console::style;
use directories::ProjectDirs;
use interprocess::local_socket::traits::ListenerExt;
use interprocess::local_socket::{GenericFilePath, Listener, ListenerOptions, ToFsName};
use std::fs;
use std::io::BufReader;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tracing::{error, info, warn};

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
            let project = ProjectDirs::from("cc", "suxin2017", "lynx")
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

    pub async fn start_daemon(&self, port: u16, data_dir: Option<String>) -> Result<()> {
        // Check if daemon is already running
        if let Ok(status) = self.get_status() {
            if status.is_running() && self.is_process_running(status.pid) {
                println!(
                    "{}",
                    style("Lynx proxy service is already running").yellow()
                );
                return Ok(());
            }
        }

        let data_dir = if let Some(data_dir) = data_dir {
            PathBuf::from(data_dir)
        } else {
            self.data_dir.clone()
        };

        // Start the daemon process
        let status = self.spawn_daemon_process(port, data_dir.clone()).await?;

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

    pub async fn restart_daemon(&self) -> Result<()> {
        println!("{}", style("Restarting Lynx proxy service...").cyan());

        // Get current configuration
        let current_status = self.get_status().map_err(|_| {
            anyhow!("No Lynx proxy service status found. Use 'daemon start' instead.")
        })?;

        let port = current_status.port;
        let data_dir = Some(current_status.data_dir.to_string_lossy().to_string());

        // Stop the daemon
        if let Err(e) = self.stop_daemon() {
            warn!("Error stopping daemon: {}", e);
        }

        // Wait a bit for cleanup
        std::thread::sleep(std::time::Duration::from_millis(500));

        // Start the daemon again
        self.start_daemon(port, data_dir).await?;

        println!(
            "{}",
            style("Lynx proxy service restarted successfully").green()
        );
        Ok(())
    }

    pub fn show_status(&self) -> Result<()> {
        match self.get_status() {
            Ok(status) => {
                println!("{}", style("=== Lynx Proxy Service Status ===").bold());
                println!("PID: {}", style(status.pid).cyan());
                println!("Port: {}", style(status.port).cyan());
                println!("Status: {}", self.format_status(&status));
                println!(
                    "Data Directory: {}",
                    style(status.data_dir.display()).cyan()
                );

                if let Ok(start_time) = status.start_time.duration_since(std::time::UNIX_EPOCH) {
                    println!(
                        "Start Time: {}",
                        style(format!("{} seconds since epoch", start_time.as_secs())).cyan()
                    );
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
    async fn spawn_daemon_process(&self, port: u16, data_dir: PathBuf) -> Result<DaemonStatus> {
        let sock_path = data_dir.join("daemon").join("ipc.sock");

        if sock_path.exists() {
            fs::remove_file(&sock_path)?;
        }

        let sock_path_name = sock_path.to_string_lossy().to_string();
        let name = sock_path_name.as_str().to_fs_name::<GenericFilePath>()?;

        let listener = ListenerOptions::new().name(name);

        let listener = listener.create_sync()?;

        let current_exe = std::env::current_exe()?;

        let mut command = Command::new(&current_exe);
        command
            .arg("run")
            .arg("--daemon")
            .arg("--port")
            .arg(port.to_string())
            .arg("--data-dir")
            .arg(data_dir.to_string_lossy().to_string())
            .arg("--ipc-socket")
            .arg(sock_path_name)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .stdin(Stdio::null());

        Self::configure_daemon_process(&mut command)?;

        let child = command.spawn()?;
        let pid = child.id();

        let mut status = DaemonStatus::new(pid, port, data_dir);

        std::mem::forget(child);

        let socket_addrs = self.wait_for_connection_info(listener)?;

        let connection_urls = socket_addrs
            .iter()
            .map(|addr| format!("http://{}", addr))
            .collect::<Vec<String>>();

        let connect_urls_str = connection_urls.join("\n");
        let ui_addr = connection_urls.first().cloned();
        status.set_connection_url(connection_urls);

        if sock_path.exists() {
            let _ = fs::remove_file(&sock_path);
        }

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

    fn wait_for_connection_info(&self, listener: Listener) -> Result<Vec<SocketAddr>> {
        if let Some(conn) = listener.incoming().filter_map(|r| r.ok()).next() {
            let recver = BufReader::new(conn);
            let socket_addr = serde_json::from_reader::<BufReader<_>, Vec<SocketAddr>>(recver)?;
            return Ok(socket_addr);
        }

        Err(anyhow!(
            "Failed to receive connection info from Lynx proxy service"
        ))
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
        style("http://:127.0.1:3000").cyan()
    );
}
