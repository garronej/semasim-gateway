#!/bin/bash

INSTALL_PATH=/usr/share/semasim
TARBALL_PATH=/tmp/semasim.tar.gz

if [[ $EUID -ne 0 ]]; then
    echo "This script require root privileges."
    exit 1
fi

if [ -d "$INSTALL_PATH" ]; then

    echo "Directory $INSTALL_PATH already exsist, uninstalling previous install"
    
    semasim_uninstaller run 2>/dev/null
    
    rm -rf $INSTALL_PATH

fi

URL="https://gw.semasim.com/releases/semasim_"$(wget -qO- https://web.semasim.com/api/version)"_"$(uname -m)".tar.gz"

wget $URL -q --show-progress -O $TARBALL_PATH

mkdir $INSTALL_PATH

tar -xzf $TARBALL_PATH -C $INSTALL_PATH

rm $TARBALL_PATH

cd $INSTALL_PATH

./node dist/bin/installer install
