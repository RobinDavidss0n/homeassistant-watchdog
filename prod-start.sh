docker compose up -d --build prod
docker system prune -f
sh prod-follow.sh