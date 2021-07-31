#!/bin/shell

func section name;
    echo "\n==============================";
    echo "\t$name";
    echo "==============================";
endfunc;

func say msg;
    echo $msg;
endfunc;

section "Tokens";

echo $PATH;

echo ${pwd};

echo "${ls -e ${pwd}}";

echo "123${pwd}xyz";

echo "abc{$path}abc{$user}abc";

section "loop.sh";
if "~/loop.sh" is file;
    cat "~/loop.sh";
endif;

say "test funcs";

section "files";

mkdir -s ttt;

cd ttt;

touch -s a;
touch -s b;

section vars;

set ls "${ls -c /bin}";

printvar;

section arrays;

echo ${count $ls};

while ${count ls} > 0;
    echo ${pop ls};
endwhile;
