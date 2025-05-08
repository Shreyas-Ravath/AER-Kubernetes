# Kubernetes Capstone Project: Node.js Application on AWS EKS

This project demonstrates the end-to-end deployment of a containerized Node.js application with a PostgreSQL backend on Amazon EKS using Kubernetes.

---

## 📁 Project Structure

```
node-capstone-app/
├── app.js
├── package.json
├── Dockerfile
├── eks-cluster.yaml
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── db-deployment.yaml
│   ├── db-service.yaml
│   ├── deployment-blue.yaml
│   ├── deployment-green.yaml
```

---

## 🛠 Prerequisites

- AWS CLI and AWS CloudShell
- Docker (CloudShell supports it)
- eksctl
- kubectl
- An ECR repository created in your AWS account

---

## 🚀 Steps to Execute

### Step 1: Create and Configure Deployment Environment

In AWS CloudShell:

```bash
# Ensure Docker, eksctl, and kubectl are installed (CloudShell usually has these)
docker --version
eksctl version
kubectl version --client
```

### Step 2: Containerize the Application and Push to ECR

1. Authenticate Docker with ECR:

```bash
aws ecr get-login-password | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<region>.amazonaws.com
```

2. Build and Tag Image:

```bash
docker build -t capstone-node-app .
docker tag capstone-node-app:latest <aws_account_id>.dkr.ecr.<region>.amazonaws.com/capstone-node-app:latest
```

3. Push Image:

```bash
docker push <aws_account_id>.dkr.ecr.<region>.amazonaws.com/capstone-node-app:latest
```

### Step 3: Create EKS Cluster

```bash
eksctl create cluster -f eks-cluster.yaml
```

Update kubeconfig:

```bash
aws eks update-kubeconfig --name capstone-cluster --region <region>
```

Verify:

```bash
kubectl get nodes
```

### Step 4: Deploy App and Database

Update the image in `deployment.yaml` to your ECR image URL.

```bash
kubectl apply -f k8s/db-deployment.yaml
kubectl apply -f k8s/db-service.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

Verify app via LoadBalancer URL.

### Step 5: Blue/Green Deployment

1. Deploy both versions:

```bash
kubectl apply -f k8s/deployment-blue.yaml
kubectl apply -f k8s/deployment-green.yaml
```

2. Update `service.yaml` to switch between blue and green:

```yaml
selector:
  app: node-app
  version: green
```

Apply:

```bash
kubectl apply -f k8s/service.yaml
```

### Step 6: Clean Up

```bash
eksctl delete cluster --name capstone-cluster --region <region>
```

---

## 📌 Notes

- Replace `<aws_account_id>`, `<region>`, and image URLs with your actual AWS values.
- All Kubernetes YAML files are located in the `k8s/` directory.
- Ensure all code and YAML files are versioned and pushed to GitHub as part of the submission.

---

## ✅ Deliverables

- GitHub repository with application and manifests
- ECR repository with container image
- Access URL or screenshot showing deployed app
