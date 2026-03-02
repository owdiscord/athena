# Athena
![Athena Logo](assets/logo-transparent.png)
Athena the moderation bot for the [Overwatch Discord server](https://owdiscord.org), forked from [Zeppelin](https://github.com/ZeppelinBot/Zeppelin). Infinite gratitude to Dragory for providing Zeppelin to our community for so many years. If you are looking for a battle-tested moderation bot for your community, Zeppelin is your best choice.

## Running
We have split things quite a bit compared to Zeppelin, primary for ease of deployment and reducing build time. Everything in production is run as containers using either Docker or Podman on a single server, so everything here is designed with that in mind.

### Dependant containers
We depend on MySQL (8.0) - specifically MySQL - not a newer and less compatible version of MariaDB or any other fork. This is the guts of the whole project. We also use Redis (or any RESP compliant key-value store, like [Valkey](https://valkey.io/)) for caching ephemeral data. In production, you also must run a reverse-proxy to allow access to the dashboard, and API (containing archive links, etc). Our proxy of choice is, of course, the wonderful [Caddy](https://caddyserver.com/).

### Migrations
Migrations are run in production as a separate container instance of the main (athena-bot) container. It runs once, succeeds, and then the bot container is started. For local development, you can run the commands as specified in the package.json for the bot (in /backend). TypeORM is heavily used here, both for migrations and queries.

### The bot itself
The bot alone is essentially built on Discord.JS and Vety (formerly Knub). It runs using Node 24 with no problem at all. We tend to use Bun or pnpm as our package managers locally, though. There's a lot of shared code among different parts of the project, so a workspace is used.

### The API
The API was previously just built alongside the bot and run with a different entryfile. This was fine, but our preference was to reduce the number of running V8 instances as much as we could, so it was split off into it's own Go project. The API container is *extremely* lean, and can be run easily with Go (currently using 1.25), or Docker if you prefer.

### The dashboard
The dashboard is a super simple Vite + Vue application. It just allows easy front-end access to editing the server config files (which are stored as YAML). It uses Discord oAuth to validate that only administrator users are given access. You can run this locally very easily with Node (or Bun). In production, we use a very lean web server image (busybox:musl/httpd) to forward the static files to Caddy, for next to 0 RAM and disk usage, compared to the previous Express proxy.

### State of the project
At the time of updating this README, the project is in a bit of a state of flux. There's still the old Node-based API code sitting around. Numerous places still reference Zeppelin in the code, while others use Athena. We hope to clean this up for our use, but we also hope to keep the codebase close enough to Zeppelin that we can still provide upstream pull-requests and such.

## Contributing
Although this is a relatively closed, focused project designed specifically for the Overwatch Discord, if there's something you want to add, either from a user point of view or a moderator point of view, there's no harm in starting a pull request. We appreciate it.

## Forking, or using elsewhere
All yours. Do whatever you'd like to with it. Keep in mind we cannot provide support, and neither can Dragory. As mentioned above, if you are looking for a battle-tested Discord bot for your community, the basis of Athena, [Zeppelin](https://github.com/ZeppelinBot/Zeppelin), is fantastic. Please do not go spamming anyone, especially not Dragory, for help with anything relating to Athena.
