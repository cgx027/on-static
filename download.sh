#!/bin/sh

# set -x

echo checking for new files from bintray.com

LINK="https://dl.bintray.com/rackhd/binary/builds/"
TARGETDIR=`cat config.json | grep microkernelDir | awk -F '"' '{print $4}'`
file_list=`curl -s $LINK | grep href= | awk -F '"' '{print $4}' | awk -F ':' '{print $2}'`

need_update=false

for file_name in $file_list
do
    file_url=$LINK$file_name

    target_file=$TARGETDIR/$file_name

    if [ ! -f $target_file ];
    then
        need_update=true
        echo $target_file does not exist, downloading from $file_url
        curl -# -L $file_url > $target_file
        echo downloaded
    fi
done

if [ $need_update = false ];
then
    echo no new files from bintray.com
fi

