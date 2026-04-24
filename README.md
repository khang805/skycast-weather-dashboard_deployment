# SkyCast — Cloud Native Deployment (Project 3)

This repository contains full source code for the **SkyCast Weather Dashboard** and all infrastructure/configuration code to deploy it as a multi-tier microservice architecture using DevOps best practices.

---

## 🏗️ 1. Architecture Overview

- **Microservice 1 (Frontend):** Node.js Express server serving static HTML/CSS/JS (Runs on port 3000)
- **Microservice 2 (Backend):** Node.js Express API proxying data from Open-Meteo (Runs on port 5000)
- **Infrastructure:** AWS EC2 configured via Terraform
- **Configuration:** Ansible playbook to install MicroK8s and ArgoCD
- **Container Orchestration:** Kubernetes (K8s Deployments & Services via NodePorts)
- **CI/CD:** GitHub Actions (builds Docker images to DockerHub) + ArgoCD (syncs cluster state)

---

## 🚀 2. Step-by-Step Deployment Guide

Follow these exact steps to deploy the application on AWS.

### Prerequisites (On your local machine)
Ensure you have the following installed locally:
- [Terraform](https://developer.hashicorp.com/terraform/downloads)
- [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)
- [AWS CLI](https://aws.amazon.com/cli/) (run `aws configure` to set up your access keys)
- Git

### Phase 1: AWS Infrastructure Provisioning (Terraform)
1. Go into the terraform directory:
   ```bash
   cd terraform
   ```
2. Initialize Terraform and apply the configuration to create the EC2 instance, VPC, and Security Groups:
   ```bash
   terraform init
   terraform apply -var="key_name=YOUR_AWS_KEY_NAME"
   # Type "yes" when prompted.
   ```
   *(Note: `YOUR_AWS_KEY_NAME` should be the name of a `.pem` key pair you generated in the AWS Console beforehand).*
3. Keep the outputted `public_ip` for the next steps!

### Phase 2: Server Configuration (Ansible)
1. Go to the Ansible directory:
   ```bash
   cd ../ansible
   ```
2. Open `inventory` (or create it) and put in the `public_ip` output by Terraform:
   ```ini
   [all]
   YOUR_EC2_PUBLIC_IP ansible_user=ubuntu ansible_ssh_private_key_file=/path/to/your/key.pem
   ```
3. Run the playbook to install MicroK8s, setup the cluster, and install ArgoCD:
   ```bash
   ansible-playbook -i inventory setup-cluster.yml
   ```

### Phase 3: Setup the CI/CD Pipeline
1. Push this entire folder to your personal **GitHub repository**.
2. Go to your repository settings on GitHub → **Secrets and variables** → **Actions**.
3. Add two new Repository Secrets for Docker Hub:
   - `DOCKERHUB_USERNAME`: your Docker Hub username
   - `DOCKERHUB_TOKEN`: your Docker Hub access token (or password)
4. Now, every time you `git push` to the `main` branch, **GitHub Actions** will automatically:
   - Build the `frontend` and `backend` Dockerfiles.
   - Push them to your Docker Hub registry.
   - Update `k8s/frontend.yaml` and `k8s/backend.yaml` with the new image tags.

### Phase 4: Continuous Deployment (ArgoCD)
1. SSH into your newly created EC2 instance using the command Terraform gave you:
   ```bash
   ssh -i /path/to/your/key.pem ubuntu@YOUR_EC2_PUBLIC_IP
   ```
2. Apply the ArgoCD application manifest to tell ArgoCD to watch your GitHub repository:
   ```bash
   # Make sure to edit k8s/argocd-app.yaml beforehand to put YOUR actual GitHub repo URL!
   kubectl apply -f k8s/argocd-app.yaml
   ```
3. **Done!** ArgoCD will automatically read the Kubernetes manifests in the `k8s/` folder and deploy the Backend and Frontend to your Kubernetes cluster.

### Phase 5: Access the Live Application
Once ArgoCD spins up the pods, you can access your application globally using your EC2 instance's Public IP!
- **Frontend Dashboard:** `http://YOUR_EC2_PUBLIC_IP:30080`
- **Backend API:** `http://YOUR_EC2_PUBLIC_IP:30050/health`

---

## 🛠️ Codebase Structure

```
├── .github/workflows/
│   └── ci.yml                 # CI automation (Docker build + K8s tag update)
├── ansible/
│   ├── setup-cluster.yml      # Installs Microk8s + ArgoCD
│   ├── ansible.cfg            
│   └── inventory              # (You create this with EC2 IP)
├── backend/
│   ├── server.js              # Node.js API (Microservice 2)
│   ├── package.json           
│   └── Dockerfile             # Backend container config
├── frontend/
│   ├── public/                # HTML/CSS/JS glassmorphism dashboard
│   ├── server.js              # Static files server (Microservice 1)
│   ├── package.json           
│   └── Dockerfile             # Frontend container config
├── k8s/
│   ├── backend.yaml           # Deployment + Service (Port 30050)
│   ├── frontend.yaml          # Deployment + Service (Port 30080)
│   └── argocd-app.yaml        # CD sync config
└── terraform/
    ├── main.tf                # AWS EC2 + Security Group setup
    ├── variables.tf           
    └── outputs.tf             
```
