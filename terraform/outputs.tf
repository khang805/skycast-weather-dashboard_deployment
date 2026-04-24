output "public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.k8s_node.public_ip
}

output "ssh_command" {
  description = "Command to SSH into the instance"
  value       = "ssh -i ${var.key_name}.pem ubuntu@${aws_instance.k8s_node.public_ip}"
}
