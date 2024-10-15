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

# Copy the zipped project folder to the VM
provisioner "file" {
  source      = "../project.zip"  # Path where zip is created in the GitHub Actions runner
  destination = "/tmp/project.zip"
}

  # Unzip the project on the VM
  provisioner "shell" {
    inline = [
      "if ! command -v unzip &> /dev/null; then sudo apt-get update && sudo apt-get install -y unzip; fi",
      "sudo unzip /tmp/project.zip -d /opt/myapp || { echo 'Failed to unzip project.zip'; exit 1; }"
    ]
  }

  # Run shell scripts in the unzipped project
  provisioner "shell" {
    inline = [
      "sudo /opt/myapp/installNodejs.sh || { echo 'Failed to install Node.js'; exit 1; }",
      "sudo /opt/myapp/installDependencies.sh || { echo 'Failed to install dependencies'; exit 1; }",
      "sudo /opt/myapp/webServiceFile.sh || { echo 'Failed to set up web service'; exit 1; }"
    ]
  }
}
