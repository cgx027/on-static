#!/bin/sh

# set -x

NAME="on-static"
SRC_DIR=`pwd`
APP_DIR="/var/$NAME"
SCRIPT_DIR="/etc/init.d/"
SCRIPT_NAME="on-static"

# Create symbol link from SRC_DIR to APP_DIR
sudo ln -s $SRC_DIR $APP_DIR

# Copy server script to /etc/init.d
sudo cp $SCRIPT_NAME $SCRIPT_DIR

# install script to other run levels
sudo update-rc.d $SCRIPT_NAME defaults
