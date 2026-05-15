# NexusVault Hyper-V Deployment

This directory contains Terraform configuration to deploy NexusVault on a Windows Hyper-V host using the `taliesins/hyperv` provider.

## Prerequisites

1.  **Windows Host**: A machine running Windows with Hyper-V enabled.
2.  **WinRM Configured**: The Windows host must have WinRM configured to allow remote management.
    Run the following in PowerShell as Administrator on the Windows host:
    ```powershell
    Enable-PSRemoting -Force
    # Allow Unencrypted traffic (if not using HTTPS)
    Set-Item WSMan:\localhost\Service\AllowUnencrypted -Value $true
    # Trust all hosts (for testing)
    Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force
    # Restart WinRM
    Restart-Service WinRM
    ```
3.  **Terraform**: Installed on your local machine (Linux/Mac/Windows).

## Usage

1.  **Initialize Terraform**:
    ```bash
    terraform init
    ```

2.  **Create `terraform.tfvars`**:
    Create a file named `terraform.tfvars` with your specific configuration:
    ```hcl
    hyperv_user     = "Administrator"
    hyperv_password = "YourPassword"
    hyperv_host     = "192.168.1.100" # IP of Windows host
    vhd_path        = "C:\\VMs\\NexusVault.vhdx" # Path on Windows host
    switch_name     = "ExternalSwitch"
    ```

3.  **Plan and Apply**:
    ```bash
    terraform plan
    terraform apply
    ```

## Notes

- The `vhd_path` must be a valid path on the **remote Windows host**, not your local machine.
- Ensure the Hyper-V switch exists or allow Terraform to create it (adjust `main.tf` if you want to use an existing one without creating it).
