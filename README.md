# EduGator
A CRUD Learning Management System

# Setup & Installation
To build EduGators, please first download [Docker Compose](https://docs.docker.com/compose/install/). Once downloaded, navigate into the root of the `EduGators` directory and run
```bash
docker-compose -f docker-compose.yml build
```
Once built (or if you already built the project), run one of the following groups of commands depending on your desired behavior:
### Running without logs
To run the containers in the background (without logs), run:
```bash
docker-compose -f docker-compose.yml up -d
```
and then visit `http://localhost:3000` on your preferred web browser. You'll then be presented with the EduGators home page. To destroy the running containers, type:
```Bash
docker-compose -f docker-compose.yml down
```
### Running with logs
To run the containers in the current terminal window, run:
```bash
docker-compose -f docker-compose.yml up
```
and then visit `http://localhost:3000` on your preferred web browser. You'll then be presented with the EduGators home page. To destroy the running containers, type:
```Bash
Ctrl+C
```
into your keyboard.

## Database login
To login to the Edugators database locally, run the following after starting up the docker-compose system:
```bash
psql -h localhost -U postgres -d edugators -p 5433 -W
```
When prompted for a password, please enter `password`.
