# on-static

__`on-static` is a tool that help [RackHD](https://github.com/rackhd) users to
manage static file resources like os images.__

Furture support may include management of other static resources
like skupack, microkernel or overlayfs. __This is not implemented so far.__

_Copyright 2015-2016, EMC, Inc._

## Introduction

With `on-static`, users can

* **Create http server** that servers operation system images used for [RackHD](https://github.com/rackhd) OS installation. OS images are mounted from iso files that can be sourced from:
  * A web link, can be http or ftp, like _http://example.com/example.iso_. **Https** is not tested yet.
  * A local file on the server which on-static in running.
  * User client where the APIs are called. Iso files are uploaded using HTTP PUT method.
  * A in-store iso file that had been uploaded before from above three sources. This is useful when you are adding a OS image that had been removed earlier.
* **Mount uploaded iso file** and expose it from http server.
* **Manage iso** files. Users can list in-store iso files, upload a new iso file, delete a in-store iso file. 

## installation

Install on-static is quite straight forward.

    git clone https://github.com/cgx027/on-static.git
    cd on-static
    npm install

## running
    sudo node index.js

## API

## Config

## Contributions are welcome