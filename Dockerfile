ARG NODE_VERSION

FROM node:${NODE_VERSION}-slim

WORKDIR /usr/src/app

COPY . .

RUN npm install

# Run the application
CMD ["npm", "start"]