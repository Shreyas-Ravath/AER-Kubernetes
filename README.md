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
|   ├── hpa.yaml
    

```

## 🚀 Steps to Execute

## Step 1: Create and Configure Deployment Environment
Sign into AWS Console
Get to the EC2 Service, and connect to KubeDeploymentServer 
### Everything is already installed. 
```bash
# Ensure Docker, eksctl, and kubectl are installed 
aws --version
docker --version
kubectl version --client
eksctl version
```


## Step 2: Containerize the Application and Push to ECR

Before starting download all project files from github, execute following on cloudshell
```bash
mkdir /home/ec2-user/capstone 
cd /home/ec2-user/capstone
git init
git pull https://github.com/Shreyas-Ravath/AER-Kubernetes.git
```

Once project files are downloaded, we will execute following commands to set the variables. 

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

## Step 3: Create EKS Cluster

```bash
eksctl create cluster -f eks-cluster.yaml
```

Update kubeconfig:

```bash
aws eks update-kubeconfig --name capstone --region $REGION
```

Verify:

```bash
kubectl get nodes
```

## Step 4: Deploy App and Database

Update the image in `deployment.yaml` to ECR image URL
Following script can be executed if the region is us-east-1 and same test account allotted.

```bash
cd /home/ec2-user/capstone/k8s
sed -i 's|<your_ecr_repo_url>|381751878913.dkr.ecr.us-east-1.amazonaws.com/capstone-project|g' deployment.yaml
cd ..
```

Deploy application on K8s cluster

```bash
kubectl apply -f k8s/db-deployment.yaml
kubectl apply -f k8s/db-service.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
```
Verify app via following command
```bash
kubectl get pods
```
Notice pods for postgres and node-app is created. We can validate the node-app using the service external IP. since we are yet to do B/G deployment. the version is set to default in deployment. 


### Step 5: Blue/Green Deployment

create two different versions to check blue green deployment
first we will push the existing image to ECR with V1 and again the same for V2. We are going to use v1 as blue env, v2 as Green
```bash
docker tag $ECR_URI:latest $ECR_URI:v1
docker push $ECR_URI:v1
docker tag $ECR_URI:latest $ECR_URI:v2
docker push $ECR_URI:v2
```

1. Deploy pods for both versions:
Now that the v1 and v2 images are created, lets update the repo url on our deployment files and create pods. Execute below commands
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
After exiting the command, copy the external-IP value and access it through any browser http://<externalIP/DNS>
We still see the version default in the landing page, as we have not defined any version to be used yet. the request may go to green or blue or default pod based on value set in service.yaml 

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

Now that service is updated to consider node-app & version tags, now the requests will be forwarded to the pod with both tags. This confirm the blue/green deployment. 

3. To check the Autoscaling, lets switch the service to use green environment, and to create stress on pods, we will execute following commands.
```bash
kubectl run load-generator --image=busybox --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://<externalIP/DNS>; done"
```
Once the above load is generated while being in green deployment, see hpa triggers and create pods as per the settings in hpa
```bash
kubectl get pods
kubectl get hpa
```

This concludes the kubernetes capstone project, with db created as service, front end using db created with service name and Blue green deployment for zero downtime and also hpa for autoscaling. 

## Step 6: Clean Up

```bash
# Set required variables
REPO_NAME="capstone-project"
REGION="us-east-1"  # Change to your desired region
CLUSTER_NAME="capstone"

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

# Step 3: Drain all nodes in the cluster (forcefully if needed)
# Temporarily delete the PodDisruptionBudget  if it exists
echo "Checking for PodDisruptionBudgets in kube-system namespace..."
pdbs=$(kubectl get pdb -n kube-system -o name)

if [ -n "$pdbs" ]; then
    echo "Deleting the following PodDisruptionBudgets:"
    echo "$pdbs"
    for pdb in $pdbs; do
        kubectl delete "$pdb" -n kube-system
    done
else
    echo "No PodDisruptionBudgets found in kube-system."
fi

echo "Locating worker nodes in cluster '$CLUSTER_NAME'..."
nodes=$(kubectl get nodes --no-headers | awk '{print $1}')

for node in $nodes; do
    echo "Draining node '$node'..."
    kubectl drain "$node" \
        --ignore-daemonsets \
        --delete-emptydir-data \
        --force \
        --grace-period=30 || \
        echo "Drain failed for node '$node'. Continuing with deletion."
done

# Step 4: Delete the EKS cluster
echo "Deleting EKS cluster '$CLUSTER_NAME' in region '$REGION'..."
eksctl delete cluster \
    --name "$CLUSTER_NAME" \
    --region "$REGION" && \
    echo "EKS cluster '$CLUSTER_NAME' deleted successfully." || \
    echo "Failed to delete EKS cluster '$CLUSTER_NAME'."

# Step 5: Delete capstone folder holding the project files. 
rm -rf /home/ec2-user/capstone


echo "Cleanup process completed."

```

