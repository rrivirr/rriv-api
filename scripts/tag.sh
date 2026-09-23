echo 'username and password are both a DO token with access to the registry'
docker login registry.digitalocean.com
docker tag 4fa34e9c10b7 registry.digitalocean.com/rriv/rriv-api:1.0.0
docker push registry.digitalocean.com/rriv/rriv-api:1.0.1


kustomize edit set image registry.digitalocean.com/rriv/rriv-api:1.0.1
