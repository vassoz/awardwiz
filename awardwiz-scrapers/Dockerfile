# hadolint global ignore=DL3016
#
# tags here: https://mcr.microsoft.com/en-us/product/playwright/tags
# use `docker pull <tag>` to locally cache metadata for playwright
FROM mcr.microsoft.com/playwright:v1.37.1
ENV CHROME_PATH=/ms-playwright/chromium-1076/chrome-linux/chrome
ARG DEBUG=0

# tools to debug via vnc (connect to this instance on port 8282)
ENV DISPLAY=:0.0

ENV TZ="America/Los_Angeles"
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
  xvfb=2:21.* x11-utils=7.7* \
  && if [ $DEBUG = 1 ]; then apt-get install --no-install-recommends -y x11vnc=0.9.* novnc=1:1.0.* fluxbox=1.3.* ; fi \
  ; apt-get clean && rm -rf /var/lib/apt/lists/*

EXPOSE 8282
EXPOSE 2222

WORKDIR /usr/src/awardwiz
COPY package.json package-lock.json ./
RUN NODE_ENV=production npm install -g npm@9 && npm i

# used for tests with vitest
COPY awardwiz-scrapers/ awardwiz-scrapers/
COPY arkalis/ arkalis/

COPY dist/ dist/
COPY awardwiz-scrapers/entrypoint.sh ./

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "--enable-source-maps", "dist/awardwiz-scrapers/main-server.js"]
