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

Two http server will be created by default:

* The northbound: Handles user requests like managing(list/create/delete) an OS image, or managing(list/create/delete) an iso file.
* The southbound: The http file server.

## installation

Install on-static is quite straight forward.

    git clone https://github.com/cgx027/on-static.git
    cd on-static
    npm install

## running

    sudo node index.js

The northbound API will by default listen at 0.0.0.0:7070, and the southbound will by default listen at 0.0.0.0:9090. Those IP addresses and ports are user configurable.

## API

### northbound
    http://0.0.0.0:7070/images: Get/list all OS images


```
curl http://0.0.0.0:7070/images | python -m json.tool
{
    "act": "Listing all imagesundefined",
    "images": [
        {
            "id": "6807e9b2-a763-4b74-bfe9-4b20fe964400",
            "iso": "client.iso",
            "name": "photon",
            "status": "OK",
            "version": "6.0"
        }
    ],
    "message": "Received get request for listing images",
    "query": {}
}
 ```

http://0.0.0.0:7070/iso


### southbound

## Config

## Contributions are welcome