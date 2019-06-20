# semasim-gateway 

[WEBSITE](https://gw.semasim.com/)

## Installing node 

NOTE: Node version used should be latest v8.

NPM_VERSION=``6.4.1``

### On armv6 hosts ( raspberry pi zero, raspberry pi 1 )
``` bash
# We can't install it from the repository so we have to download it manually:
# ( The download link is on the download page of the node.js website )
$ cd ~ && wget https://nodejs.org/dist/v8.12.0/node-v8.12.0-linux-armv6l.tar.xz
$ tar xf node-v8.*-linux-armv6l.tar.xz
# Add the path to node bin dir to the PATH, .bashrc:  export PATH=/home/pi/node-v8.12.0-linux-armv6l/bin:$PATH
$ source ~/.bashrc
$ sudo su
$ npm install -g npm@NPM_VERSION
```

### On any other host ( armv7, x32, x64 )
``` bash
$ curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
$ sudo apt-get install -y nodejs
$ sudo npm install -g npm@NPM_VERSION
```

## Publish release
To build, bundle and publish a new release for 
a specifics arch there is no need to ``npm install`` just clone
this repo then: 

* run ``npm run partial_install`` ( without sudo, only first time )
* run ``npm run release`` ( without sudo )

## Run local copy of the code for debugging
``` bash
$ npm install
$ sudo ./node dist/bin/installer install
$ npm start 
```