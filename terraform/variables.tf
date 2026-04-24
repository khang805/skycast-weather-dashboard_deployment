variable "aws_region" {
  description = "The AWS region to deploy to"
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "t3.medium" # t3.medium recommended for k8s instead of t2.micro
}

variable "key_name" {
  description = "Name of the existing AWS Key Pair to allow SSH access (e.g. my-aws-key)"
  type        = string
}
