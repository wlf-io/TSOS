#!/bin/shell

func say msg;
    echo $msg;
endfunc;

echo $PATH;

echo ${pwd};

echo "${ls ${pwd}}";

echo "123${pwd}xyz";

sleep 1;

say test;

sleep 1;

mkdir -s ttt;

cd ttt;

touch -s a;
touch -s b;

say "done!!!";

set ls ${ls /bin}

printvar;
