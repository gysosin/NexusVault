output "vm_id" {
  value = hyperv_machine_instance.default.id
}

output "vm_name" {
  value = hyperv_machine_instance.default.name
}

output "vm_ip_addresses" {
  value = hyperv_machine_instance.default.network_adaptor[0].ip_addresses
}
