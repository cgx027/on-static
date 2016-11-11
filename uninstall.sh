#!/bin/sh

# set -x

NAME="on-static"
SRC_DIR=`pwd`
APP_DIR="/var/$NAME"
SCRIPT_DIR="/etc/init.d/"
SCRIPT_NAME="on-static"
LOG_DIR="/var/log/$NAME.log"
LOG_FILE="$LOG_DIR/$NAME.log"


sudo rm -rf $APP_DIR

sudo rm -f $SCRIPT_DIR/$SCRIPT_NAME

sudo rm -f $LOG_DIR/$LOG_FILE

sudo update-rc.d -f $SCRIPT_NAME remove
