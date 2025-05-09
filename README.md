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

## 🚀 Steps to Execute

### Step 1: Create and Configure Deployment Environment
Sign into AWS Console
Click the CloudShell icon (top-right nav bar)
  o	If you are unable to create a cloudshell, ensure following VPC endpoints are created on the region you are trying to create cloudshell
      com.amazonaws.<region>.ssm
      com.amazonaws.<region>.ec2messages
      com.amazonaws.<region>.ssmmessages

In AWS CloudShell:

```bash
# Ensure Docker, eksctl, and kubectl are installed (CloudShell usually has these)
aws --version
docker --version
eksctl version
kubectl version --client

#If eksctl is not installed, execute following commands. 
```bash
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_Linux_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
eksctl version
```

### Step 2: Containerize the Application and Push to ECR

### Before starting download all project files from github, execute following on cloudshell
```bash
git init
git pull https://github.com/Shreyas-Ravath/AER-Kubernetes.git
```

### Once project files are downloaded, we have to set variable which is being used in next commands. 

```bash 
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1  # update if using another region
REPO_NAME=capstone-project
ECR_URI=${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}
#Create ecr repository where images will be stored. 
aws ecr create-repository --repository-name $REPO_NAME
```


1. Authenticate Docker with ECR:

```bash
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URI
```

2. Build and Tag Image:

```bash
docker build -t capstone-node-app .
docker tag capstone-node-app:latest $ECR_URI:latest
```

3. Push Image:

```bash
docker push $ECR_URI:latest
```

### Step 3: Create EKS Cluster

```bash
eksctl create cluster -f eks-cluster.yaml
```

Update kubeconfig:

```bash
aws eks update-kubeconfig --name capstone-cluster --region $REGION
```

Verify:

```bash
kubectl get nodes
```

### Step 4: Deploy App and Database

Update the image in `deployment.yaml` to your ECR image URL.
## Now to change the ECR Image URL execute following command on cloud shell

```bash
cd k8s
sed -i 's|<your_ecr_repo_url>|381751878913.dkr.ecr.us-east-1.amazonaws.com/capstone-project|g' deployment.yaml
cd ..
```

Deploy application on K8s cluster

```bash
kubectl apply -f k8s/db-deployment.yaml
kubectl apply -f k8s/db-service.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

Verify app via LoadBalancer URL.
```bash
kubectl get svc node-app-service
```
# Execute the above command copy the external IP DNS name /IP and access it through any browser http://<externalIP/DNS>

### Step 5: Blue/Green Deployment

# create two different versions to check blue green deployment
```bash
docker tag $ECR_URI:latest $ECR_URI:v1
docker push $ECR_URI:v1
# since we have limited 1GB capacity in Cloushell we would need to delete the images so that we can create different version
docker rmi $ECR_URI:v1
docker rmi $ECR_URI:latest

# Modify app.js file to differentiate the version of app deployed. 

sed -i 's/Hello from the Capstone Node.js App!/Hello from the GREEN version of the Capstone App!/' ./app.js

docker build -t $ECR_URI .

docker tag $ECR_URI:latest $ECR_URI:v2
docker push $ECR_URI:v2

```

1. Deploy both versions:
# Since we created new shell we need to configure the shell once again. execute following commands 

```bash
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_Linux_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
eksctl version
aws eks update-kubeconfig --name capstone-cluster --region $REGION

sed -i 's|<your_ecr_repo_url>|381751878913.dkr.ecr.us-east-1.amazonaws.com/capstone-project|g' k8s/deployment-blue.yaml
sed -i 's|<your_ecr_repo_url>|381751878913.dkr.ecr.us-east-1.amazonaws.com/capstone-project|g' k8s/deployment-green.yaml
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

eksctl delete cluster --name capstone-cluster --region $REGION

```

