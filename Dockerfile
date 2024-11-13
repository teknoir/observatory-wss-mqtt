ARG NODE_VERSION

# FROM node:${NODE_VERSION}-slim
FROM node:${NODE_VERSION}

RUN apt-get update && apt-get install -y \
    iproute2 \
    curl

WORKDIR /usr/src/app

COPY . .

RUN npm install
RUN chmod +x entrypoint.sh

EXPOSE 8080

# Run the application
# CMD ["npm", "run", "start"]
ENTRYPOINT [ "/usr/src/app/entrypoint.sh" ]


