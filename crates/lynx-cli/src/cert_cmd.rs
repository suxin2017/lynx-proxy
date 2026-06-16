use anyhow::Result;

use crate::cert::platform;
use crate::resolve_data_dir;

pub struct CertOptions {
    pub data_dir: Option<String>,
}

pub fn run_install(options: CertOptions) -> Result<()> {
    platform::ensure_supported()?;
    let data_dir = resolve_data_dir(options.data_dir)?;
    platform::install(&data_dir)
}

pub fn run_uninstall(options: CertOptions) -> Result<()> {
    platform::ensure_supported()?;
    let data_dir = resolve_data_dir(options.data_dir)?;
    platform::uninstall(&data_dir)
}

pub fn run_status(options: CertOptions) -> Result<()> {
    platform::ensure_supported()?;
    let data_dir = resolve_data_dir(options.data_dir)?;
    platform::print_status(&data_dir)
}
