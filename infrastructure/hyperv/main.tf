terraform {
  required_providers {
    hyperv = {
      source  = "taliesins/hyperv"
      version = ">= 1.0.3"
    }
  }
}

provider "hyperv" {
  user     = var.hyperv_user
  password = var.hyperv_password
  host     = var.hyperv_host
  port     = var.hyperv_port
  https    = var.hyperv_https
  insecure = var.hyperv_insecure
}

resource "hyperv_network_switch" "default" {
  name = var.switch_name
}

resource "hyperv_machine_instance" "default" {
  name                 = var.vm_name
  generation           = 2
  processor_count      = var.vm_cpus
  static_memory        = true
  memory_startup_bytes = var.vm_memory
  wait_for_state_timeout = 10
  wait_for_ips_timeout   = 10

  vm_processor {
    expose_virtualization_extensions = true
  }

  # Network adapter
  network_adaptor {
    name        = "wan"
    switch_name = hyperv_network_switch.default.name
  }

  # Hard disk drive
  hard_disk_drives {
    controller_type = "Scsi"
    controller_number = 0
    controller_location = 0
    path = var.vhd_path
  }

  # DVD drive (optional, for ISOs)
  dvd_drives {
    controller_number = 0
    controller_location = 1
    path = var.iso_path
  }
}
