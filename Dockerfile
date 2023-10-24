ARG NODE_VERSION

FROM node:${NODE_VERSION}-slim

WORKDIR /usr/src/app

COPY . .

RUN npm install

EXPOSE 8080

# Run the application
CMD ["npm", "run", "start"]


