#!/bin/shell

func say msg;
    echo $msg;
endfunc;

echo $PATH;

echo ${pwd};

echo "${ls -e ${pwd}}";

echo "123${pwd}xyz";

sleep 1;

if "~/loop.sh" is file;
    echo "\n==============================";
    echo "==============================";
    cat "~/loop.sh";
    echo "==============================";
    echo "==============================\n";
endif;

say test;

sleep 1;

mkdir -s ttt;

cd ttt;

touch -s a;
touch -s b;

say "done!!!";

set ls "${ls -c /bin}";

printvar;
