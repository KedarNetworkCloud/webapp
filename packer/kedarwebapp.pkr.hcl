packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.8"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_region" {
  default = "us-east-1"
}

source "amazon-ebs" "ubuntu" {
  region                      = var.aws_region
  source_ami                  = "ami-0cad6ee50670e3d0e"
  instance_type               = "t2.micro"
  profile                     = "AWSDEVGIT"
  ssh_username                = "ubuntu"
  ami_name                    = "MyApp-Image-{{timestamp}}"
  ami_description             = "Custom image with application dependencies"
  vpc_id                      = "vpc-0730c8b36ce4de851"
  subnet_id                   = "subnet-0e2418a1340e2bbf2"
  associate_public_ip_address = true             # Corrected line
  ami_users                   = ["043309350711"] # Replace with your DEMO AWS account ID
  tags = {
    Name = "MyApp-Image"
  }
}

build {
  sources = ["source.amazon-ebs.ubuntu"]

  # Create the csye6225 group and user
  provisioner "shell" {
    inline = [
      "sudo groupadd csye6225 || { echo 'Failed to create group csye6225'; exit 1; }",
      "sudo useradd -r -g csye6225 -s /usr/sbin/nologin -m csye6225 || { echo 'Failed to create user csye6225'; exit 1; }",
      "echo 'csye6225 ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/csye6225", # Allow csye6225 to use sudo without a password
    ]
  }

  # Copy the zipped project folder to the VM
  provisioner "file" {
    source      = "../project.zip" # Path where zip is created in the GitHub Actions runner
    destination = "/tmp/project.zip"
  }


  # Unzip the project on the VM and set ownership
  provisioner "shell" {
    inline = [
      "if ! command -v unzip &> /dev/null; then sudo apt-get update && sudo apt-get install -y unzip; fi",
      "sudo unzip /tmp/project.zip -d /opt/myapp || { echo 'Failed to unzip project.zip'; exit 1; }",
      "sudo chown -R csye6225:csye6225 /opt/myapp || { echo 'Failed to change ownership of /opt/myapp'; exit 1; }",
      "sudo chmod +x /opt/myapp/*.sh || { echo 'Failed to make scripts executable'; exit 1; }",
      "ls -l /opt/myapp"
    ]
  }

  provisioner "shell" {
    scripts = [
      "../installNodejs.sh",
      "../installDependencies.sh",
      "../installCloudWatchAgent.sh",
      "../webServiceFile.sh"
    ]
  }

}
