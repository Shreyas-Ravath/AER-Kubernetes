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
kubectl version --client
eksctl version

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

### Update the image in `deployment.yaml` to your ECR image URL.
### Now to change the ECR Image URL execute following command on cloud shell

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
Verify app via following command
```bash
kubectl get pods
```
<<<<<<< HEAD
# After execiting the command, observe there would be three pods created. 


### Step 5: Blue/Green Deployment

# create two different versions to check blue green deployment
# first we will push the existing image to ECR with V1 tag. since we have limited 1GB capacity in Cloushell we would need to delete the images so that we can create different version
=======
### Execute the above command copy the external IP DNS name /IP and access it through any browser http://<externalIP/DNS>

### Step 5: Blue/Green Deployment

## create two different versions to check blue green deployment
>>>>>>> 44647d6f1d2422fe0d53d721a4b557eeffaf3d0d
```bash
docker tag $ECR_URI:latest $ECR_URI:v1
docker push $ECR_URI:v1
docker rmi $ECR_URI:v1
docker rmi $ECR_URI:latest
docker rmi capstone-node-app:latest
```

# Delete the current cloudshell. Go to Actions in cloud shell and delete the current shell. Open a new shell. As all variables are lost we need to configure the shell once again. execute following commands. 
```bash
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_Linux_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1  # update if using another region
REPO_NAME=capstone-project
ECR_URI=${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}
git init
git pull https://github.com/Shreyas-Ravath/AER-Kubernetes.git
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URI
aws eks update-kubeconfig --name capstone-cluster --region $REGION
```

# Now Modify app.js file to differentiate the version of app deployed. 

```bash

sed -i 's/Hello from the Capstone Node.js App!/Hello from the GREEN version of the Capstone App!/' ./app.js

docker build -t $ECR_URI .

docker tag $ECR_URI:latest $ECR_URI:v2
docker push $ECR_URI:v2
```

1. Deploy both versions:
### Since we created new shell we need to configure the shell once again. execute following commands 

```bash
sed -i 's|<your_ecr_repo_url>|381751878913.dkr.ecr.us-east-1.amazonaws.com/capstone-project|g' k8s/deployment-blue.yaml
sed -i 's|<your_ecr_repo_url>|381751878913.dkr.ecr.us-east-1.amazonaws.com/capstone-project|g' k8s/deployment-green.yaml
kubectl apply -f k8s/deployment-blue.yaml
kubectl apply -f k8s/deployment-green.yaml
```

Verify app via LoadBalancer URL.
```bash
kubectl get svc node-app-service
```
# After execiting the command, copy the external-IP value and access it through any browser http://<externalIP/DNS>

2. Update `service.yaml` to switch between blue or green:

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
# Set required variables
REPO_NAME="capstone-project"
REGION="us-east-1"  # Change to your desired region
CLUSTER_NAME="capstone-cluster"

echo "Starting cleanup process for ECR repository '$REPO_NAME' and EKS cluster '$CLUSTER_NAME'..."

# Step 1: List and delete images in ECR repository
echo "Checking for images in ECR repository '$REPO_NAME'..."
image_ids=$(aws ecr list-images \
    --repository-name "$REPO_NAME" \
    --query 'imageIds' \
    --output json \
    --region "$REGION")

if [ "$image_ids" == "[]" ]; then
    echo "No images found in repository '$REPO_NAME'. Skipping image deletion."
else
    echo "Images found in '$REPO_NAME'. Deleting all images..."
    aws ecr batch-delete-image \
        --repository-name "$REPO_NAME" \
        --image-ids "$image_ids" \
        --region "$REGION"
    echo "All images deleted successfully from '$REPO_NAME'."
fi

# Step 2: Delete the ECR repository
echo "Deleting ECR repository '$REPO_NAME'..."
aws ecr delete-repository \
    --repository-name "$REPO_NAME" \
    --force \
    --region "$REGION"

if [ $? -eq 0 ]; then
    echo "Repository '$REPO_NAME' deleted successfully."
else
    echo "Failed to delete repository '$REPO_NAME'."
fi

# Step 3: Delete the EKS cluster
echo "Deleting EKS cluster '$CLUSTER_NAME' in region '$REGION'..."
eksctl delete cluster \
    --name "$CLUSTER_NAME" \
    --region "$REGION"

if [ $? -eq 0 ]; then
    echo "EKS cluster '$CLUSTER_NAME' deleted successfully."
else
    echo "Failed to delete EKS cluster '$CLUSTER_NAME'."
fi

echo "Cleanup process completed."

```

