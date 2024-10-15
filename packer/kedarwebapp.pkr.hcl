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

  # Copy the shell script to the VM
  provisioner "file" {
    source      = "C:\\Users\\kedar\\Music\\Ass4DevWebApp\\webapp-fork\\createEnv.sh"  # Replace with the actual path to your createEnv.sh script
    destination = "/opt/myapp/createEnv.sh"  # Destination path in the VM
  }

  # Run the script to create the .env file
  provisioner "shell" {
    inline = [
      "chmod +x /opt/myapp/createEnv.sh || { echo 'Failed to make createEnv.sh executable'; exit 1; }",
      "sudo /opt/myapp/createEnv.sh || { echo 'Failed to run createEnv.sh'; exit 1; }"
    ]
  }


  # Copy the zipped folder to the VM
  provisioner "file" {
    source      = "//mnt//c/Users//kedar//Music//Ass4DevWebApp//webapp-fork.zip"  # Path to the zipped project folder
    destination = "/tmp/webapp.zip"
  }

  # Unzip the web application in the VM
  provisioner "shell" {
    inline = [
      "if ! command -v unzip &> /dev/null; then sudo apt-get update && sudo apt-get install -y unzip; fi",  # Install unzip if not installed
      "sudo unzip /tmp/webapp.zip -d /opt/myapp || { echo 'Failed to unzip webapp.zip'; exit 1; }"  # Unzip the web application
    ]
  }

  # Make all shell scripts executable in the unzipped folder
  provisioner "shell" {
    inline = [
      "sudo chmod +x /opt/myapp/webapp-fork/*.sh || { echo 'Failed to make all shell scripts executable'; exit 1; }"
    ]
  }

  # Run each script in the appropriate order
  provisioner "shell" {
    inline = [
      "sudo /opt/myapp/webapp-fork/installNodejs.sh || { echo 'Failed to install Node.js'; exit 1; }",
      "sudo /opt/myapp/webapp-fork/installDependencies.sh || { echo 'Failed to install dependencies'; exit 1; }",
      "sudo /opt/myapp/webapp-fork/webServiceFile.sh || { echo 'Failed to set up the web service file'; exit 1; }"
    ]
  }
}
