#!/bin/bash
echo 'username and password are both a DO token with access to the registry'
docker login registry.digitalocean.com
TAG=registry.digitalocean.com/rriv/rriv-api:$1
docker build . -t $TAG
docker push $TAG

cd deployment/overlays/development
kustomize edit set image $TAG
cd ../prod
kustomize edit set image $TAG
cd ../../../

kubectl config use-context do-sfo2-rriv-prod
kustomize build deployment/overlays/prod/ | kubectl apply -f -
