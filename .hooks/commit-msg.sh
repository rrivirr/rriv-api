GREEN='\033[0;32m'
NC='\033[0m' # No Color
echo "${GREEN}Checking commit message for compliance with conventional commits${NC}"
echo "${GREEN}Speficiation: https://www.conventionalcommits.org/en/v1.0.0/${NC}"
echo $1
cat $1
deno --allow-env --allow-sys --allow-read npm:commitlint -H 'https://www.conventionalcommits.org/en/v1.0.0/' --edit $1


