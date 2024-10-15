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
  region          = var.aws_region
  source_ami      = "ami-0cad6ee50670e3d0e"
  instance_type   = "t2.micro"
  profile         = "DevRole"
  ssh_username    = "ubuntu"
  ami_name        = "MyApp-Image-{{timestamp}}"
  ami_description = "Custom image with application dependencies"
  vpc_id          = "vpc-0730c8b36ce4de851"
  subnet_id       = "subnet-084d1da55866c7496"
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
      "sudo useradd -r -g csye6225 -s /usr/sbin/nologin -m csye6225 || { echo 'Failed to create user csye6225'; exit 1; }"
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
      "ls -l /opt/myapp"
    ]
  }

  # Run shell scripts in the unzipped project as csye6225
  provisioner "shell" {
    inline = [
      "sudo -u csye6225 /opt/myapp/project/postgresInstall.sh || { echo 'Failed to install PostgreSQL'; exit 1; }",
      "sudo -u csye6225 /opt/myapp/project/installNodejs.sh || { echo 'Failed to install Node.js'; exit 1; }",
      "sudo -u csye6225 /opt/myapp/project/installDependencies.sh || { echo 'Failed to install dependencies'; exit 1; }",
      "sudo -u csye6225 /opt/myapp/project/webServiceFile.sh || { echo 'Failed to set up web service'; exit 1; }"
    ]
  }

}
