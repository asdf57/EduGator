# EduGator
A CRUD Learning Management System

# Setup & Installation
To run EduGators, please first download [Docker Compose](https://docs.docker.com/compose/install/). Once downloaded, run
```bash
docker-compose up -d
```
and then visit `http://localhost:3000` on your preferred web browser. You will then be presented with the EduGators home page. To destroy the running container, type:
```Bash
docker-compose down -v
```

## Database login
To login to the Edugators database locally, run the following after starting up the docker-compose system:
```bash
psql -h localhost -U postgres -d edugators -p 5433 -W
```
