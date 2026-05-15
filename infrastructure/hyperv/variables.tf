variable "hyperv_user" {
  description = "Hyper-V Admin User"
  type        = string
}

variable "hyperv_password" {
  description = "Hyper-V Admin Password"
  type        = string
  sensitive   = true
}

variable "hyperv_host" {
  description = "Hyper-V Host IP or Hostname"
  type        = string
  default     = "localhost"
}

variable "hyperv_port" {
  description = "WinRM Port"
  type        = number
  default     = 5985
}

variable "hyperv_https" {
  description = "Use HTTPS for WinRM"
  type        = bool
  default     = false
}

variable "hyperv_insecure" {
  description = "Skip SSL validation"
  type        = bool
  default     = true
}

variable "vm_name" {
  description = "Name of the VM"
  type        = string
  default     = "NexusVault-VM"
}

variable "vm_cpus" {
  description = "Number of CPUs"
  type        = number
  default     = 2
}

variable "vm_memory" {
  description = "Memory in bytes (default 4GB)"
  type        = number
  default     = 4294967296
}

variable "switch_name" {
  description = "Name of the Hyper-V Switch"
  type        = string
  default     = "Default Switch"
}

variable "vhd_path" {
  description = "Absolute path to the VHDX file on the Hyper-V host"
  type        = string
}

variable "iso_path" {
  description = "Absolute path to an ISO file (optional)"
  type        = string
  default     = ""
}
