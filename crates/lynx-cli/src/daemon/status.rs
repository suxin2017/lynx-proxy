use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::SystemTime;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonStatus {
    pub pid: u32,
    pub port: u16,
    pub status: ProcessStatus,
    pub start_time: SystemTime,
    pub data_dir: PathBuf,
    pub connection_url: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProcessStatus {
    Running,
    Stopped,
    Error(String),
}

impl DaemonStatus {
    pub fn new(pid: u32, port: u16, data_dir: PathBuf) -> Self {
        Self {
            pid,
            port,
            status: ProcessStatus::Running,
            start_time: SystemTime::now(),
            data_dir,
            connection_url: None,
        }
    }

    pub fn is_running(&self) -> bool {
        matches!(self.status, ProcessStatus::Running)
    }

    pub fn set_error(&mut self, error: String) {
        self.status = ProcessStatus::Error(error);
    }

    pub fn set_stopped(&mut self) {
        self.status = ProcessStatus::Stopped;
    }

    pub fn set_connection_url(&mut self, url: Vec<String>) {
        self.connection_url = Some(url);
    }
}
