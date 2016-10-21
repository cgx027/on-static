# on-static

__`on-static` is a tool that help [RackHD](https://github.com/rackhd) users to
manage static file resources like os images.__

Furture support may include management of other static resources
like skupack, microkernel or overlayfs. __This is not implemented so far.__

_Copyright 2015-2016, EMC, Inc._

## Introduction

With `on-static`, users can

* **Create http server** that servers operation system images used for [RackHD](https://github.com/rackhd) OS installation. OS images are mounted from iso files that can be loaded from different sources.
* **Mount uploaded iso file** and expose it from http server.
* **Manage iso** files. Users can list in-store iso files, upload a new iso file, delete a in-store iso file. 

Two http servers will be created by default:

* The northbound: Handles user requests like managing(list/create/delete) an OS image, or managing(list/create/delete) an iso file.
* The southbound: The http file server.

## Installation

Install on-static is quite straight forward.

    git clone https://github.com/cgx027/on-static.git
    cd on-static
    npm install

## Running

    sudo node index.js

The northbound API will by default listen at 0.0.0.0:7070, and the southbound will by default listen at 0.0.0.0:9090. Those IP addresses and ports are user configurable.

## API

### northbound

1. GET http://0.0.0.0:7070/images: Get/list all OS images. No parameter is needed.

```
curl http://0.0.0.0:7070/images | python -m json.tool
{
    "act": "Listing all images",
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

2. PUT http://0.0.0.0:7070/images: Add OS images. Three parameters are needed. 
    * name: in query or body, the OS name. Should be one of [ubuntu, rhel, photon, centos]. The list will expand as we move on. 
    * version: in query of body, the OS version. User can use any string that they like. Examples will include, 14.04, 14.04-x64, 14.04-EMC-Ted-test.
    * isoweb, isostore, isolocal or isoclient: the source of the iso file used to build the OS image. At least one of those four should be specified. If more then one is specified, on-static will use isostore over isolocal over isoweb over isoclient. 
        * isoweb: use iso file from web, can be http or ftp, like _http://example.com/example.iso_. **Https** is not tested yet.
        * isolocal: use iso file from the server which on-static in running.
        * isoclient: use iso file uploaded from user client where the APIs are called. Iso files are uploaded using HTTP PUT method.
        * isostore: use in-store iso file that had been uploaded before from above three sources. This is useful when you are adding a OS image that had been removed earlier.
    
Using isoclient

```
curl -X PUT "http://10.62.59.150:7070/images?name=photon&version=1.0&isoclient=client.iso" --upload-file path-to-file/test.iso
Uploaded 100 %
Upload finished!
{
    "message": "Received put request for create images",
    "query": {
        "name": "photon",
        "version": "1.0",
        "isoclient": "client.iso"
    },
    "body": { },
    "act": "Adding images for os named photon version 1.0",
    "images": [
        {
            "id": "3065063b-d993-471b-8573-e8afcfb713fa",
            "iso": "client.iso",
            "name": "photon",
            "version": "1.0",
            "status": "preparing"
        }
    ]
}
```

Using isoweb. image status will set as 'downloading iso' and iso download will be carried out at the background. You can check the status afterwards using get/list image API. 

```
curl -X PUT "http://10.62.59.150:7070/images?name=photon&version=1.0&isoweb=http://10.62.59.150:9090/iso/photon-1.0.iso"
{
    "message": "Received put request for create images",
    "query": {
        "name": "photon",
        "version": "1.0",
        "isoweb": "http://10.62.59.150:9090/iso/photon-1.0"
    },
    "body": { },
    "act": "Adding images for os named photon version 1.0",
    "images": [
        {
            "id": "39647624-e640-41d0-901b-afc58af98725",
            "iso": "photon-1.0.iso",
            "name": "photon",
            "version": "1.0",
            "status": "downloading iso"
        }
    ]
}
```

using isolocal. 

```
curl -X PUT "http://10.62.59.150:7070/images?name=centos&version=7.0&isolocal=/home/onrack/github/on-static/static/files/iso/centos-7.0.iso"
{
    "message": "Received put request for create images",
    "query": {
        "name": "centos",
        "version": "7.0",
        "isolocal": "/home/onrack/github/on-static/static/files/iso/centos-7.0.iso"
    },
    "body": { },
    "act": "Adding images for os named centos version 7.0",
    "images": [
        {
            "id": "9fce7e8f-c7ef-49db-a47f-1924675d5e29",
            "iso": "/home/onrack/github/on-static/static/files/iso/centos-7.0.iso",
            "name": "centos",
            "version": "7.0",
            "status": "preparing"
        }
    ]
}
```

Using isostore.

```
curl -X PUT "http://10.62.59.150:7070/images?name=centos&version=7.0&isostore=centos-7.0.iso"
{
    "message": "Received put request for create images",
    "query": {
        "name": "centos",
        "version": "7.0",
        "isostore": "centos-7.0.iso"
    },
    "body": { },
    "act": "Adding images for os named centos version 7.0",
    "images": [
        {
            "id": "b6b3e3be-c799-4af4-86c8-09a99d3aa7c7",
            "iso": "centos-7.0.iso",
            "name": "centos",
            "version": "7.0",
            "status": "preparing"
        }
    ]
}
```


http://0.0.0.0:7070/iso


### southbound

## Config

## Contributions are welcome